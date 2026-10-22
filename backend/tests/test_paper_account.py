from paper_account import PaperAccount


def test_buy_reduces_cash_and_adds_coins():
    account = PaperAccount(starting_cash=1000)
    ok, _ = account.buy("BTC", 500, price=100)
    assert ok
    assert account.cash == 500
    assert account.holdings["BTC"] == 5


def test_buy_with_too_little_cash_fails():
    account = PaperAccount(starting_cash=100)
    ok, message = account.buy("BTC", 500, price=100)
    assert not ok
    assert "Insufficient" in message
    assert account.cash == 100 and account.holdings == {}


def test_sell_adds_cash_and_removes_coins():
    account = PaperAccount(starting_cash=1000)
    account.buy("BTC", 1000, price=100)          # 10 coins
    ok, _ = account.sell("BTC", 4, price=150)    # sells at a profit
    assert ok
    assert account.cash == 600
    assert account.holdings["BTC"] == 6


def test_selling_everything_removes_the_holding():
    account = PaperAccount(starting_cash=1000)
    account.buy("BTC", 1000, price=100)
    account.sell("BTC", 10, price=100)
    assert "BTC" not in account.holdings


def test_cannot_sell_more_than_owned():
    account = PaperAccount(starting_cash=1000)
    account.buy("BTC", 100, price=100)           # 1 coin
    ok, message = account.sell("BTC", 2, price=100)
    assert not ok
    assert "Not enough" in message


def test_invalid_amounts_are_rejected():
    account = PaperAccount(starting_cash=1000)
    assert not account.buy("BTC", 0, price=100)[0]
    assert not account.buy("BTC", 100, price=0)[0]
    assert not account.sell("BTC", -1, price=100)[0]


def test_total_value_and_reset():
    account = PaperAccount(starting_cash=1000)
    account.buy("BTC", 500, price=100)           # 5 coins, $500 cash
    assert account.total_value({"BTC": 200}) == 1500
    account.reset()
    assert account.cash == 1000 and account.holdings == {}
