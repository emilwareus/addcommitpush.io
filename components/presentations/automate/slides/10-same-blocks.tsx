import { SlideFrame, SlideHeading } from '../shared';

const blocks = ['Database', 'Login app', 'Knowledge', 'Workflow', 'Agent'] as const;

type Use = 'used' | 'unused';

const builds: readonly { name: string; uses: readonly Use[] }[] = [
  { name: 'Live build 1', uses: ['used', 'used', 'used', 'used', 'used'] },
  { name: 'Live build 2', uses: ['used', 'unused', 'unused', 'used', 'used'] },
];

function Mark({ use }: { use: Use }) {
  if (use === 'unused') {
    return (
      <span className="oz-pill inline-block h-[34px] w-[34px] border-[1.5px] border-dashed border-[#D0D0D0]" />
    );
  }
  return (
    <span
      className="oz-pill flex h-[36px] w-[36px] items-center justify-center"
      style={{ background: '#7BC900' }}
    >
      <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
        <path
          d="M1.5 7 L6.5 12 L16.5 2"
          stroke="#FFFFFF"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function SameBlocksSlide() {
  return (
    <SlideFrame center>
      <SlideHeading title="Same blocks. Different work." size={64} />
      <table className="oz-card w-full border-separate border-spacing-0 px-[40px] py-[16px]">
        <thead>
          <tr>
            <th className="w-[240px]" />
            {blocks.map((block) => (
              <th
                key={block}
                scope="col"
                className="border-b border-[#E5E5E5] py-[24px] text-[23px] font-medium"
              >
                {block}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {builds.map((build, row) => (
            <tr key={build.name}>
              <th
                scope="row"
                className={`oz-serif py-[30px] text-left text-[25px] ${
                  row === 0 ? 'border-b border-[#E5E5E5]' : ''
                }`}
              >
                {build.name}
              </th>
              {build.uses.map((use, column) => (
                <td
                  key={blocks[column]}
                  className={row === 0 ? 'border-b border-[#E5E5E5]' : ''}
                  aria-label={`${blocks[column]}: ${use === 'unused' ? 'not used' : 'used'}`}
                >
                  <div className="flex justify-center">
                    <Mark use={use} />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </SlideFrame>
  );
}
