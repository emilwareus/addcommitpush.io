"""Generate sample datasets for testing."""
from pathlib import Path

import pandas as pd
import numpy as np


def main() -> None:
    """Generate sample data files."""
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(exist_ok=True)

    # Sample 1: Customers (Excel)
    np.random.seed(42)
    customers = pd.DataFrame({
        "customer_id": range(1, 101),
        "purchase_amount": np.random.randint(50, 500, 100),
        "category": np.random.choice(["Electronics", "Clothing", "Home"], 100),
        "region": np.random.choice(["North", "South", "East", "West"], 100),
        "date": pd.date_range("2024-01-01", periods=100, freq="D"),
    })
    customers.to_excel(data_dir / "customers.xlsx", index=False)
    print(f"Created: {data_dir / 'customers.xlsx'}")

    # Sample 2: Events (Parquet)
    events = pd.DataFrame({
        "user_id": np.random.randint(1, 50, 500),
        "event_type": np.random.choice(["view", "click", "purchase"], 500),
        "timestamp": pd.date_range("2024-01-01", periods=500, freq="h"),
        "value": np.random.randint(1, 100, 500),
    })
    events.to_parquet(data_dir / "events.parquet", index=False)
    print(f"Created: {data_dir / 'events.parquet'}")


if __name__ == "__main__":
    main()
