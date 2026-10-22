import pytest

from ma_crossover import MovingAverageCrossover, moving_average


def test_moving_average():
    assert moving_average([1, 2, 3, 4], 2) == 3.5
    assert moving_average([1, 2], 3) is None


def test_short_window_must_be_smaller():
    with pytest.raises(ValueError):
        MovingAverageCrossover(short_window=5, long_window=5)


def test_holds_when_there_is_not_enough_history():
    strategy = MovingAverageCrossover(short_window=2, long_window=4)
    assert strategy.decide([1, 2, 3, 4], in_position=False) == "hold"


def test_buys_when_short_average_crosses_above_long():
    strategy = MovingAverageCrossover(short_window=2, long_window=4)
    # Flat, then a sudden jump: the 2-day average rises above the 4-day average.
    prices = [10, 10, 10, 10, 10, 20]
    assert strategy.decide(prices, in_position=False) == "buy"


def test_does_not_buy_twice():
    strategy = MovingAverageCrossover(short_window=2, long_window=4)
    prices = [10, 10, 10, 10, 10, 20]
    assert strategy.decide(prices, in_position=True) == "hold"


def test_sells_when_short_average_crosses_below_long():
    strategy = MovingAverageCrossover(short_window=2, long_window=4)
    prices = [10, 10, 10, 10, 10, 1]
    assert strategy.decide(prices, in_position=True) == "sell"
    assert strategy.decide(prices, in_position=False) == "hold"
