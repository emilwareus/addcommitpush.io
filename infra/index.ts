import { scryptSync } from 'node:crypto';
import * as dockerBuild from '@pulumi/docker-build';
import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';

const gcpConfig = new pulumi.Config('gcp');
const lifeConfig = new pulumi.Config('addcommitpush-life');
const projectId = gcpConfig.require('project');
const region = gcpConfig.require('region');
const frontendOrigin = lifeConfig.require('frontendOrigin');
const openaiApiKey = lifeConfig.requireSecret('openaiApiKey');

const apiName = 'life-api';
const workerName = 'life-worker';
const provisionName = 'life-provision';
const databaseName = 'life';
const databaseUserName = 'life';
const artifactRepositoryName = 'apps';

const requiredApis = [
  'artifactregistry.googleapis.com',
  'billingbudgets.googleapis.com',
  'cloudresourcemanager.googleapis.com',
  'cloudscheduler.googleapis.com',
  'compute.googleapis.com',
  'iam.googleapis.com',
  'run.googleapis.com',
  'secretmanager.googleapis.com',
  'serviceusage.googleapis.com',
  'sqladmin.googleapis.com',
];

const enabledApis = requiredApis.map(
  (service) =>
    new gcp.projects.Service(`api-${service.split('.')[0]}`, {
      project: projectId,
      service,
      disableDependentServices: false,
      disableOnDestroy: false,
    })
);

const currentProject = gcp.organizations.getProjectOutput({ projectId });
const apiUrl = pulumi.interpolate`https://${apiName}-${currentProject.number}.${region}.run.app`;

const monthlyBudget = new gcp.billing.Budget(
  'life-monthly-budget',
  {
    billingAccount: '012E23-CF597A-29BBB1',
    displayName: 'addcommitpush Life monthly budget',
    budgetFilter: {
      calendarPeriod: 'MONTH',
      projects: [pulumi.interpolate`projects/${currentProject.number}`],
      creditTypesTreatment: 'INCLUDE_ALL_CREDITS',
    },
    amount: {
      specifiedAmount: {
        currencyCode: 'SEK',
        units: '150',
      },
    },
    thresholdRules: [
      { thresholdPercent: 0.5 },
      { thresholdPercent: 0.8 },
      { thresholdPercent: 1.0 },
      { thresholdPercent: 1.0, spendBasis: 'FORECASTED_SPEND' },
    ],
  },
  { dependsOn: enabledApis }
);

const artifactRepository = new gcp.artifactregistry.Repository(
  'life-images',
  {
    project: projectId,
    location: region,
    repositoryId: artifactRepositoryName,
    description: 'Deployable images for addcommitpush.io services',
    format: 'DOCKER',
    cleanupPolicyDryRun: false,
    cleanupPolicies: [
      {
        id: 'delete-untagged-after-fourteen-days',
        action: 'DELETE',
        condition: {
          tagState: 'UNTAGGED',
          olderThan: '1209600s',
        },
      },
    ],
  },
  { dependsOn: enabledApis }
);

const imageName = pulumi.interpolate`${region}-docker.pkg.dev/${projectId}/${artifactRepository.repositoryId}/life:latest`;
const lifeImage = new dockerBuild.Image(
  'life-image',
  {
    context: { location: '../life' },
    dockerfile: { location: '../life/Dockerfile' },
    platforms: ['linux/amd64'],
    push: true,
    tags: [imageName],
    buildOnPreview: false,
    exec: true,
  },
  { dependsOn: artifactRepository }
);

const databasePassword = new random.RandomPassword('database-password', {
  length: 32,
  special: false,
});
const encryptionKey = new random.RandomBytes('encryption-key', { length: 32 });
const ownerToken = new random.RandomBytes('owner-token', { length: 32 });
const uiPassword = new random.RandomPassword('ui-password', {
  length: 24,
  special: false,
});
const uiPasswordSalt = new random.RandomBytes('ui-password-salt', { length: 16 });
const uiSessionSecret = new random.RandomBytes('ui-session-secret', { length: 32 });
const ownerId = new random.RandomUuid('owner-id');
const credentialId = new random.RandomUuid('credential-id');

const uiPasswordHash = pulumi.secret(
  pulumi.all([uiPassword.result, uiPasswordSalt.base64]).apply(([password, saltBase64]) => {
    const salt = Buffer.from(saltBase64, 'base64');
    const cost = 16_384;
    const blockSize = 8;
    const parallelization = 1;
    const hash = scryptSync(password, salt, 32, {
      N: cost,
      r: blockSize,
      p: parallelization,
      maxmem: 256 * cost * blockSize,
    });
    return [
      '$scrypt',
      'v=1',
      `N=${cost},r=${blockSize},p=${parallelization}`,
      salt.toString('base64url'),
      hash.toString('base64url'),
    ].join('$');
  })
);

const databaseInstance = new gcp.sql.DatabaseInstance(
  'life-postgres',
  {
    project: projectId,
    name: 'life-postgres',
    region,
    databaseVersion: 'POSTGRES_17',
    deletionProtection: true,
    settings: {
      tier: 'db-f1-micro',
      edition: 'ENTERPRISE',
      availabilityType: 'ZONAL',
      diskType: 'PD_HDD',
      diskSize: 10,
      diskAutoresize: false,
      deletionProtectionEnabled: true,
      ipConfiguration: {
        ipv4Enabled: true,
        sslMode: 'ALLOW_UNENCRYPTED_AND_ENCRYPTED',
      },
      backupConfiguration: {
        enabled: true,
        startTime: '02:00',
        pointInTimeRecoveryEnabled: false,
        backupRetentionSettings: {
          retainedBackups: 7,
          retentionUnit: 'COUNT',
        },
      },
      maintenanceWindow: {
        day: 7,
        hour: 3,
        updateTrack: 'stable',
      },
      userLabels: {
        application: 'life',
        environment: 'production',
      },
    },
  },
  {
    dependsOn: enabledApis,
    protect: true,
  }
);

const database = new gcp.sql.Database('life-database', {
  project: projectId,
  instance: databaseInstance.name,
  name: databaseName,
  charset: 'UTF8',
});

const databaseUser = new gcp.sql.User('life-database-user', {
  project: projectId,
  instance: databaseInstance.name,
  name: databaseUserName,
  password: databasePassword.result,
});

const databaseUrl = pulumi.secret(
  pulumi.interpolate`postgresql://${databaseUserName}:${databasePassword.result}@localhost/${database.name}?host=/cloudsql/${databaseInstance.connectionName}&sslmode=disable`
);

interface ManagedSecret {
  secret: gcp.secretmanager.Secret;
  version: gcp.secretmanager.SecretVersion;
}

function managedSecret(
  resourceName: string,
  secretId: string,
  value: pulumi.Input<string>
): ManagedSecret {
  const secret = new gcp.secretmanager.Secret(
    resourceName,
    {
      project: projectId,
      secretId,
      replication: { auto: {} },
      labels: {
        application: 'life',
        environment: 'production',
      },
    },
    { dependsOn: enabledApis }
  );
  const version = new gcp.secretmanager.SecretVersion(`${resourceName}-version`, {
    secret: secret.id,
    secretData: value,
    deletionPolicy: 'DISABLE',
  });
  return { secret, version };
}

const runtimeSecrets = {
  databaseUrl: managedSecret('database-url', 'life-database-url', databaseUrl),
  encryptionKey: managedSecret(
    'encryption-key-secret',
    'life-encryption-key',
    encryptionKey.base64
  ),
  openaiApiKey: managedSecret('openai-api-key', 'life-openai-api-key', openaiApiKey),
};
const frontendSecrets = {
  ownerToken: managedSecret('owner-token-secret', 'life-user-token', ownerToken.hex),
  uiPassword: managedSecret('ui-password-secret', 'life-ui-password', uiPassword.result),
  uiPasswordHash: managedSecret('ui-password-hash-secret', 'life-ui-password-hash', uiPasswordHash),
  uiSessionSecret: managedSecret(
    'ui-session-secret-manager',
    'life-ui-session-secret',
    uiSessionSecret.hex
  ),
};
const runtimeServiceAccount = new gcp.serviceaccount.Account(
  'life-runtime-identity',
  {
    project: projectId,
    accountId: 'life-runtime',
    displayName: 'Life API and job runtime',
  },
  { dependsOn: enabledApis }
);
const provisionServiceAccount = new gcp.serviceaccount.Account(
  'life-provision-identity',
  {
    project: projectId,
    accountId: 'life-provision',
    displayName: 'Life database migration and owner provisioning',
  },
  { dependsOn: enabledApis }
);
const schedulerServiceAccount = new gcp.serviceaccount.Account(
  'life-scheduler-identity',
  {
    project: projectId,
    accountId: 'life-scheduler',
    displayName: 'Life worker scheduler invoker',
  },
  { dependsOn: enabledApis }
);

const runtimeCloudSqlAccess = new gcp.projects.IAMMember('runtime-cloudsql-client', {
  project: projectId,
  role: 'roles/cloudsql.client',
  member: pulumi.interpolate`serviceAccount:${runtimeServiceAccount.email}`,
});
const runtimeSecretAccess = Object.values(runtimeSecrets).map(
  ({ secret }, index) =>
    new gcp.secretmanager.SecretIamMember(`runtime-secret-access-${index}`, {
      project: projectId,
      secretId: secret.id,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${runtimeServiceAccount.email}`,
    })
);
const provisionCloudSqlAccess = new gcp.projects.IAMMember('provision-cloudsql-client', {
  project: projectId,
  role: 'roles/cloudsql.client',
  member: pulumi.interpolate`serviceAccount:${provisionServiceAccount.email}`,
});
const provisionSecrets = [runtimeSecrets.databaseUrl, frontendSecrets.ownerToken];
const provisionSecretAccess = provisionSecrets.map(
  ({ secret }, index) =>
    new gcp.secretmanager.SecretIamMember(`provision-secret-access-${index}`, {
      project: projectId,
      secretId: secret.id,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${provisionServiceAccount.email}`,
    })
);

function serviceSecretEnvironment(
  name: string,
  managed: ManagedSecret
): gcp.types.input.cloudrunv2.ServiceTemplateContainerEnv {
  return {
    name,
    valueSource: {
      secretKeyRef: {
        secret: managed.secret.secretId,
        version: 'latest',
      },
    },
  };
}

function jobSecretEnvironment(
  name: string,
  managed: ManagedSecret
): gcp.types.input.cloudrunv2.JobTemplateTemplateContainerEnv {
  return {
    name,
    valueSource: {
      secretKeyRef: {
        secret: managed.secret.secretId,
        version: 'latest',
      },
    },
  };
}

const commonLiteralEnvironment = [
  { name: 'DATABASE_MAX_CONNECTIONS', value: '5' },
  { name: 'LIFE_ALLOWED_ORIGIN', value: frontendOrigin },
  { name: 'LIFE_FRONTEND_BASE_URL', value: frontendOrigin },
  { name: 'LIFE_PUBLIC_BASE_URL', value: apiUrl },
  { name: 'RUST_LOG', value: 'info' },
];
const commonSecretEnvironment = [
  serviceSecretEnvironment('DATABASE_URL', runtimeSecrets.databaseUrl),
  serviceSecretEnvironment('LIFE_ENCRYPTION_KEY', runtimeSecrets.encryptionKey),
  serviceSecretEnvironment('OPENAI_API_KEY', runtimeSecrets.openaiApiKey),
];
const commonJobSecretEnvironment = [
  jobSecretEnvironment('DATABASE_URL', runtimeSecrets.databaseUrl),
  jobSecretEnvironment('LIFE_ENCRYPTION_KEY', runtimeSecrets.encryptionKey),
  jobSecretEnvironment('OPENAI_API_KEY', runtimeSecrets.openaiApiKey),
];
const runtimeDependencies = [
  database,
  databaseUser,
  runtimeCloudSqlAccess,
  ...runtimeSecretAccess,
  ...Object.values(runtimeSecrets).map(({ version }) => version),
];
const provisionDependencies = [
  database,
  databaseUser,
  provisionCloudSqlAccess,
  ...provisionSecretAccess,
  ...provisionSecrets.map(({ version }) => version),
];

const apiService = new gcp.cloudrunv2.Service(
  'life-api-service',
  {
    project: projectId,
    name: apiName,
    location: region,
    description: 'Personal Life API',
    deletionProtection: false,
    ingress: 'INGRESS_TRAFFIC_ALL',
    scaling: {
      scalingMode: 'AUTOMATIC',
      minInstanceCount: 0,
      maxInstanceCount: 1,
    },
    template: {
      serviceAccount: runtimeServiceAccount.email,
      timeout: '300s',
      maxInstanceRequestConcurrency: 20,
      containers: [
        {
          name: 'api',
          image: lifeImage.ref,
          ports: { name: 'http1', containerPort: 8080 },
          envs: [...commonLiteralEnvironment, ...commonSecretEnvironment],
          resources: {
            limits: {
              cpu: '1',
              memory: '512Mi',
            },
            cpuIdle: true,
            startupCpuBoost: false,
          },
          volumeMounts: [{ name: 'cloudsql', mountPath: '/cloudsql' }],
          startupProbe: {
            httpGet: { path: '/healthz', port: 8080 },
            initialDelaySeconds: 0,
            timeoutSeconds: 2,
            periodSeconds: 5,
            failureThreshold: 24,
          },
          livenessProbe: {
            httpGet: { path: '/healthz', port: 8080 },
            initialDelaySeconds: 10,
            timeoutSeconds: 2,
            periodSeconds: 30,
            failureThreshold: 3,
          },
        },
      ],
      volumes: [
        {
          name: 'cloudsql',
          cloudSqlInstance: { instances: [databaseInstance.connectionName] },
        },
      ],
    },
    traffics: [
      {
        type: 'TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST',
        percent: 100,
      },
    ],
  },
  { dependsOn: runtimeDependencies }
);

const publicApiAccess = new gcp.cloudrunv2.ServiceIamMember('public-api-invoker', {
  project: projectId,
  location: apiService.location,
  name: apiService.name,
  role: 'roles/run.invoker',
  member: 'allUsers',
});

interface RuntimeJobOptions {
  args: string[];
  command: string;
  dependencies: pulumi.Resource[];
  environment: gcp.types.input.cloudrunv2.JobTemplateTemplateContainerEnv[];
  jobName: string;
  resourceName: string;
  serviceAccount: pulumi.Input<string>;
}

function createRuntimeJob(options: RuntimeJobOptions): gcp.cloudrunv2.Job {
  return new gcp.cloudrunv2.Job(
    options.resourceName,
    {
      project: projectId,
      name: options.jobName,
      location: region,
      deletionProtection: false,
      template: {
        taskCount: 1,
        parallelism: 1,
        template: {
          serviceAccount: options.serviceAccount,
          timeout: '900s',
          maxRetries: 0,
          containers: [
            {
              name: options.jobName,
              image: lifeImage.ref,
              commands: [options.command],
              args: options.args,
              envs: options.environment,
              resources: {
                limits: {
                  cpu: '1',
                  memory: '512Mi',
                },
              },
              volumeMounts: [{ name: 'cloudsql', mountPath: '/cloudsql' }],
            },
          ],
          volumes: [
            {
              name: 'cloudsql',
              cloudSqlInstance: { instances: [databaseInstance.connectionName] },
            },
          ],
        },
      },
    },
    { dependsOn: options.dependencies }
  );
}

const workerJob = createRuntimeJob({
  resourceName: 'life-worker-job',
  jobName: workerName,
  command: '/usr/local/bin/life-worker',
  args: ['--drain'],
  serviceAccount: runtimeServiceAccount.email,
  environment: [...commonLiteralEnvironment, ...commonJobSecretEnvironment],
  dependencies: runtimeDependencies,
});
const provisionJob = createRuntimeJob({
  resourceName: 'life-provision-job',
  jobName: provisionName,
  command: '/usr/local/bin/life-provision',
  args: [],
  serviceAccount: provisionServiceAccount.email,
  environment: [
    jobSecretEnvironment('DATABASE_URL', runtimeSecrets.databaseUrl),
    jobSecretEnvironment('LIFE_USER_TOKEN', frontendSecrets.ownerToken),
    { name: 'LIFE_OWNER_ID', value: ownerId.result },
    { name: 'LIFE_CREDENTIAL_ID', value: credentialId.result },
    { name: 'LIFE_OWNER_DISPLAY_NAME', value: 'Emil Wåreus' },
    { name: 'LIFE_OWNER_TIMEZONE', value: 'Europe/Stockholm' },
    { name: 'LIFE_OWNER_LOCALE', value: 'en' },
  ],
  dependencies: provisionDependencies,
});

const schedulerWorkerAccess = new gcp.cloudrunv2.JobIamMember('scheduler-worker-invoker', {
  project: projectId,
  location: workerJob.location,
  name: workerJob.name,
  role: 'roles/run.invoker',
  member: pulumi.interpolate`serviceAccount:${schedulerServiceAccount.email}`,
});

const workerSchedule = new gcp.cloudscheduler.Job(
  'life-worker-schedule',
  {
    project: projectId,
    region,
    name: 'life-worker-hourly',
    description: 'Drain queued Life connector jobs once per hour',
    schedule: '0 * * * *',
    timeZone: 'Europe/Stockholm',
    attemptDeadline: '320s',
    retryConfig: {
      retryCount: 0,
    },
    httpTarget: {
      httpMethod: 'POST',
      uri: pulumi.interpolate`https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${workerJob.name}:run`,
      body: Buffer.from('{}').toString('base64'),
      headers: {
        'Content-Type': 'application/json',
      },
      oauthToken: {
        serviceAccountEmail: schedulerServiceAccount.email,
      },
    },
  },
  { dependsOn: schedulerWorkerAccess }
);

export const lifeApiUrl = apiUrl;
export const lifeOwnerId = ownerId.result;
export const lifeProvisionJob = provisionJob.name;
export const lifeWorkerJob = workerJob.name;
export const lifeWorkerSchedule = workerSchedule.name;
export const cloudSqlInstance = databaseInstance.connectionName;
export const image = lifeImage.ref;
export const publicAccessPolicy = publicApiAccess.id;
export const monthlyBudgetName = monthlyBudget.displayName;
