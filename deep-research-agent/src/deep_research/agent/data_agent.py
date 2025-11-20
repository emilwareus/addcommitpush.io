"""Data analysis agent."""

from pathlib import Path
from typing import Any

import pandas as pd

from ..llm.client import get_llm
from ..notebook.builder import NotebookBuilder
from ..tools.executor import CodeExecutor
from ..utils.logger import get_logger

logger = get_logger(__name__)


class DataAgent:
    """EDA and notebook generation agent."""

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self.llm = get_llm(model)
        self.executor = CodeExecutor()

    async def analyze(self, filepath: str, query: str) -> Path:
        """Perform EDA and generate notebook.

        Args:
            filepath: Path to CSV file
            query: Analysis goal/question (e.g., "predict car prices")
        """
        logger.info("eda_started", filepath=filepath, query=query)

        try:
            # Load data for schema
            df = pd.read_csv(filepath)
            schema = self._get_schema(df)
        except FileNotFoundError:
            logger.error("file_not_found", filepath=filepath)
            raise ValueError(f"File not found: {filepath}")
        except pd.errors.EmptyDataError:
            logger.error("empty_file", filepath=filepath)
            raise ValueError(f"File is empty: {filepath}")
        except Exception as e:
            logger.error("csv_load_error", filepath=filepath, error=str(e))
            raise ValueError(f"Failed to load CSV: {str(e)}")

        # Create notebook in centralized notebooks directory
        file_path_obj = Path(filepath)
        # Get repo root (assume we're in deep-research-agent/)
        notebooks_dir = Path.cwd() / "notebooks"
        notebooks_dir.mkdir(exist_ok=True)
        nb_path = notebooks_dir / f"{file_path_obj.stem}_eda.ipynb"

        nb = NotebookBuilder(f"EDA: {file_path_obj.name}")

        # Act I: Context
        context = await self._generate_context(filepath, schema, query)
        nb.add_act("I", context)

        # Act II: Load data
        load_code = self._generate_load_code(filepath)
        nb.add_act("II", "Loading and inspecting the dataset.")
        nb.add_code(load_code)

        # Execute to get data in kernel
        load_result = self.executor.execute(load_code)
        if not load_result.success:
            logger.error("load_execution_failed", error=load_result.error)
            nb.add_markdown(f"⚠️ **Error loading data**: {load_result.stderr}")

        # Act III: Data quality
        quality_code = self._generate_quality_code()
        nb.add_act("III", "Checking data quality and cleanliness.")
        nb.add_code(quality_code)

        quality_result = self.executor.execute(quality_code)
        if quality_result.success:
            interpretation = await self._interpret(quality_result.stdout, "data quality")
            nb.add_markdown(interpretation)
        else:
            nb.add_markdown(f"⚠️ **Error checking data quality**: {quality_result.stderr}")

        # Act IV: Target Analysis
        target_col = self._identify_target_column(schema, query)
        if target_col:
            target_code = self._generate_target_analysis_code(target_col, schema)
            nb.add_act("IV", f"Analyzing the target variable: `{target_col}`")
            nb.add_code(target_code)

            target_result = self.executor.execute(target_code)
            if target_result.success:
                target_interpretation = await self._interpret(
                    target_result.stdout, f"target variable '{target_col}'"
                )
                nb.add_markdown(target_interpretation)

        # Act V: Feature exploration
        explore_code = self._generate_explore_code(schema)
        nb.add_act("V", "Exploring key features and relationships.")
        nb.add_code(explore_code)

        # Act VI: Sanity Baseline
        if target_col:
            baseline_code = self._generate_baseline_code(target_col, schema)
            nb.add_act("VI", "Building a simple baseline model for reference.")
            nb.add_code(baseline_code)

        # Act VII: Insights
        insights = await self._generate_insights(schema, query)
        nb.add_act("VII", insights)

        # Save
        nb.save(str(nb_path))
        logger.info("eda_completed", notebook=str(nb_path))

        # Cleanup
        self.executor.shutdown()

        return nb_path

    def _get_schema(self, df: pd.DataFrame) -> dict[str, Any]:
        """Extract schema information."""
        return {
            "shape": df.shape,
            "columns": df.columns.tolist(),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "missing": df.isnull().sum().to_dict(),
        }

    def _generate_load_code(self, filepath: str) -> str:
        """Generate data loading code."""
        return f"""import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Set style
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 6)

# Load data
df = pd.read_csv('{filepath}')

# First look
print(f"Shape: {{df.shape}}")
df.head()
"""

    def _generate_quality_code(self) -> str:
        """Generate data quality check code."""
        return """# Missing values
missing = df.isnull().sum()
missing_pct = (missing / len(df)) * 100
print("Missing values:")
print(missing_pct[missing_pct > 0].sort_values(ascending=False))

# Duplicates
duplicates = df.duplicated().sum()
print(f"\\nDuplicates: {duplicates}")

# Data types
print("\\nData types:")
print(df.dtypes)
"""

    def _generate_explore_code(self, schema: dict[str, Any]) -> str:
        """Generate feature exploration code."""
        numeric_cols = [
            col for col, dtype in schema["dtypes"].items() if dtype in ("int64", "float64")
        ][:5]

        code = "# Numeric feature distributions\n"
        for col in numeric_cols:
            code += "plt.figure(figsize=(10, 4))\n"
            code += f"df['{col}'].hist(bins=30, edgecolor='black')\n"
            code += f"plt.title('{col} Distribution')\n"
            code += f"plt.xlabel('{col}')\n"
            code += "plt.ylabel('Frequency')\n"
            code += "plt.show()\n\n"

        # Correlation matrix if enough numeric columns
        if len(numeric_cols) >= 2:
            code += "# Correlation matrix\n"
            code += "plt.figure(figsize=(10, 8))\n"
            code += f"numeric_cols = {numeric_cols}\n"
            code += "corr = df[numeric_cols].corr()\n"
            code += "sns.heatmap(corr, annot=True, fmt='.2f', cmap='coolwarm', center=0)\n"
            code += "plt.title('Feature Correlation Matrix')\n"
            code += "plt.tight_layout()\n"
            code += "plt.show()\n\n"

        return code

    def _identify_target_column(self, schema: dict[str, Any], query: str) -> str | None:
        """Identify the target column based on naming patterns or query.

        Priority order:
        1. Column name explicitly mentioned in query (e.g., "predict price")
        2. Common target patterns (price, target, label, etc.)
        3. Last numeric column as fallback
        """
        cols: list[Any] = schema["columns"]
        query_lower = query.lower()

        # Priority 1: Check if query explicitly mentions predicting a specific column
        # Look for patterns like "predict X", "forecast X", "analyze X"
        prediction_keywords = ["predict", "forecast", "estimate", "analyze", "model"]
        for keyword in prediction_keywords:
            if keyword in query_lower:
                # Extract words after the keyword
                query_parts = query_lower.split(keyword)
                if len(query_parts) > 1:
                    after_keyword = query_parts[1].strip()
                    # Check if any column name appears in the next few words
                    for col in cols:
                        col_lower = str(col).lower()
                        # Check exact match or column name at start of phrase
                        if col_lower in after_keyword.split()[:5]:
                            return str(col)

        # Priority 2: Check naming patterns (these are strong indicators)
        target_patterns = [
            "price",
            "cost",
            "value",
            "amount",
            "salary",
            "revenue",
            "sales",
            "target",
            "label",
            "class",
            "y",
            "outcome",
            "result",
        ]

        for pattern in target_patterns:
            for col in cols:
                col_lower = str(col).lower()
                if pattern in col_lower:
                    return str(col)

        # Priority 3: Check if query mentions any column name anywhere
        for col in cols:
            if str(col).lower() in query_lower:
                return str(col)

        # Fallback: Last numeric column
        if cols:
            last_col = str(cols[-1])
            if schema["dtypes"].get(last_col) in ("int64", "float64"):
                return last_col

        return None

    def _generate_target_analysis_code(self, target_col: str, schema: dict[str, Any]) -> str:
        """Generate target variable analysis code."""
        dtype = schema["dtypes"].get(target_col)

        if dtype in ("int64", "float64"):
            # Numeric target - regression
            # ruff: noqa: F821
            return f"""# Target variable: {target_col}
print(f"Target: {target_col}")
print(f"Type: {{df['{target_col}'].dtype}}")
print(f"\\nStatistics:")
print(df['{target_col}'].describe())

# Distribution
plt.figure(figsize=(12, 4))

plt.subplot(1, 2, 1)
df['{target_col}'].hist(bins=50, edgecolor='black')
plt.title('{target_col} Distribution')
plt.xlabel('{target_col}')
plt.ylabel('Frequency')

plt.subplot(1, 2, 2)
df['{target_col}'].plot(kind='box')
plt.title('{target_col} Box Plot')
plt.ylabel('{target_col}')

plt.tight_layout()
plt.show()

# Check for outliers
Q1 = df['{target_col}'].quantile(0.25)
Q3 = df['{target_col}'].quantile(0.75)
IQR = Q3 - Q1
outliers = ((df['{target_col}'] < (Q1 - 1.5 * IQR)) | (df['{target_col}'] > (Q3 + 1.5 * IQR))).sum()
print(f"\\nOutliers (IQR method): {{outliers}} ({{outliers/len(df)*100:.1f}}%)")
"""
        else:
            # Categorical target - classification
            # ruff: noqa: F821
            return f"""# Target variable: {target_col}
print(f"Target: {target_col}")
print(f"Type: {{df['{target_col}'].dtype}}")
print(f"\\nValue counts:")
print(df['{target_col}'].value_counts())
print(f"\\nClass distribution:")
print(df['{target_col}'].value_counts(normalize=True))

# Distribution
plt.figure(figsize=(10, 5))
df['{target_col}'].value_counts().plot(kind='bar', edgecolor='black')
plt.title('{target_col} Distribution')
plt.xlabel('{target_col}')
plt.ylabel('Count')
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()
"""

    def _generate_baseline_code(self, target_col: str, schema: dict[str, Any]) -> str:
        """Generate baseline model code."""
        dtype = schema["dtypes"].get(target_col)

        if dtype in ("int64", "float64"):
            # Regression baseline
            return f"""# Simple baseline: predict mean
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import numpy as np

# Prepare data
y = df['{target_col}']
X = df.select_dtypes(include=[np.number]).drop(columns=['{target_col}'])

# Handle missing values
X = X.fillna(X.mean())

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Baseline: predict mean
baseline_pred = np.full(len(y_test), y_train.mean())
baseline_mse = mean_squared_error(y_test, baseline_pred)
baseline_r2 = r2_score(y_test, baseline_pred)

print(f"Baseline Model (Mean Prediction)")
print(f"MSE: {{baseline_mse:.2f}}")
print(f"RMSE: {{np.sqrt(baseline_mse):.2f}}")
print(f"R²: {{baseline_r2:.4f}}")
print(f"\\nMean prediction: {{y_train.mean():.2f}}")
"""
        else:
            # Classification baseline
            return f"""# Simple baseline: predict most frequent class
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import numpy as np

# Prepare data
y = df['{target_col}']
X = df.select_dtypes(include=[np.number])

# Handle missing values
X = X.fillna(X.mean())

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Baseline: predict most frequent class
most_frequent = y_train.mode()[0]
baseline_pred = np.full(len(y_test), most_frequent)
baseline_acc = accuracy_score(y_test, baseline_pred)

print(f"Baseline Model (Most Frequent Class)")
print(f"Accuracy: {{baseline_acc:.4f}}")
print(f"Most frequent class: {{most_frequent}}")
print(f"\\nClass distribution in training:")
print(y_train.value_counts(normalize=True))
"""

    async def _generate_context(self, filepath: str, schema: dict[str, Any], query: str) -> str:
        """Generate Act I context."""
        prompt = f"""Create context for EDA notebook:

Dataset: {filepath}
Shape: {schema['shape']}
Analysis Goal: {query}

Write 2-3 paragraphs covering:
- What question we're trying to answer
- Why this analysis matters
- Initial hypotheses based on the goal: "{query}"
"""

        response = await self.llm.ainvoke(prompt)
        return str(response.content)

    async def _interpret(self, output: str, context: str) -> str:
        """Interpret code output."""
        prompt = f"""Interpret these {context} results:

{output}

Provide 2-3 sentence interpretation with actionable insights.
"""

        response = await self.llm.ainvoke(prompt)
        return str(response.content)

    async def _generate_insights(self, schema: dict[str, Any], query: str) -> str:
        """Generate final insights."""
        prompt = f"""Generate final insights for EDA focused on the goal: "{query}"

Dataset shape: {schema['shape']}
Columns: {schema['columns']}

Based on the analysis goal "{query}", provide:
1. 3 key data insights relevant to this goal
2. 1 specific recommendation for next steps
3. Suggested modeling approach (if applicable)
"""

        response = await self.llm.ainvoke(prompt)
        return str(response.content)
