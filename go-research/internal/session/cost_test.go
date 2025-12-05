package session

import "testing"

func TestNewCostBreakdown(t *testing.T) {
	cost := NewCostBreakdown("unknown-model", 100, 50, 0)

	if cost.InputTokens != 100 || cost.OutputTokens != 50 || cost.TotalTokens != 150 {
		t.Fatalf("unexpected token counts: %+v", cost)
	}

	if cost.TotalCost <= 0 {
		t.Fatalf("expected total cost to be > 0, got %f", cost.TotalCost)
	}
}



