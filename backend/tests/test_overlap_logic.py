"""Unit tests for the centralized half-open-interval formula in app/db.py.
This is the single highest-risk correctness bug in the product per
context/data-contracts.md — every boundary case here must be exact."""

from datetime import datetime

from app.db import _instant_occupied, _ranges_overlap

T15 = datetime(2026, 9, 5, 15, 0, 0)
T16 = datetime(2026, 9, 5, 16, 0, 0)
T17 = datetime(2026, 9, 5, 17, 0, 0)


class TestInstantOccupied:
    def test_instant_before_window_is_free(self):
        assert _instant_occupied(T15, T17, datetime(2026, 9, 5, 14, 59, 59)) is False

    def test_instant_at_start_is_occupied(self):
        assert _instant_occupied(T15, T17, T15) is True

    def test_instant_inside_window_is_occupied(self):
        assert _instant_occupied(T15, T17, T16) is True

    def test_instant_at_end_is_free(self):
        """The defining boundary case: a booking ending at T does NOT occupy
        T itself — see data-contracts.md's Time, Date, and Status Semantics."""
        assert _instant_occupied(T15, T17, T17) is False

    def test_instant_after_window_is_free(self):
        assert _instant_occupied(T15, T17, datetime(2026, 9, 5, 17, 0, 1)) is False


class TestRangesOverlap:
    def test_identical_ranges_overlap(self):
        assert _ranges_overlap(T15, T17, T15, T17) is True

    def test_partial_overlap(self):
        assert _ranges_overlap(T15, T17, T16, datetime(2026, 9, 5, 18, 0, 0)) is True

    def test_back_to_back_does_not_overlap(self):
        """A new range starting exactly when an existing one ends must NOT be
        flagged as a conflict — this is the same boundary rule, applied to a
        range instead of an instant."""
        assert _ranges_overlap(T15, T17, T17, datetime(2026, 9, 5, 18, 0, 0)) is False

    def test_back_to_back_other_direction(self):
        assert _ranges_overlap(T16, T17, T15, T16) is False

    def test_disjoint_ranges_do_not_overlap(self):
        assert (
            _ranges_overlap(
                T15, T16, datetime(2026, 9, 5, 20, 0, 0), datetime(2026, 9, 5, 21, 0, 0)
            )
            is False
        )

    def test_one_range_fully_inside_another_overlaps(self):
        assert _ranges_overlap(T15, datetime(2026, 9, 5, 20, 0, 0), T16, T17) is True


class TestExplicitHourBoundaries:
    """The contract's named example (v2 task §13): 09:00–10:00 and 10:00–11:00
    are adjacent, not overlapping; both overlap 09:30–10:30."""

    T09 = datetime(2026, 9, 5, 9, 0, 0)
    T10 = datetime(2026, 9, 5, 10, 0, 0)
    T11 = datetime(2026, 9, 5, 11, 0, 0)
    T0930 = datetime(2026, 9, 5, 9, 30, 0)
    T1030 = datetime(2026, 9, 5, 10, 30, 0)

    def test_0900_1000_and_1000_1100_do_not_overlap(self):
        assert _ranges_overlap(self.T09, self.T10, self.T10, self.T11) is False
        assert _ranges_overlap(self.T10, self.T11, self.T09, self.T10) is False

    def test_0900_1000_and_0930_1030_overlap(self):
        assert _ranges_overlap(self.T09, self.T10, self.T0930, self.T1030) is True

    def test_1000_1100_and_0930_1030_overlap(self):
        assert _ranges_overlap(self.T10, self.T11, self.T0930, self.T1030) is True

    def test_instant_at_1000_is_free_of_a_0900_1000_booking(self):
        assert _instant_occupied(self.T09, self.T10, self.T10) is False

    def test_instant_at_1000_is_occupied_by_a_1000_1100_booking(self):
        assert _instant_occupied(self.T10, self.T11, self.T10) is True
