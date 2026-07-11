from unittest.mock import MagicMock

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.services.auth import get_current_user
from app.routers.donation import router


def make_app(user_id="test-user-uuid-1234"):
    """App with the donation router, auth applied the same way app.main does
    (donation.py itself has no auth dependency -- it's attached at
    include_router time), overridden to a fixed user for these tests."""
    app = FastAPI()
    app.include_router(router, prefix="/donation", dependencies=[Depends(get_current_user)])
    mock_user = MagicMock()
    mock_user.id = user_id
    app.dependency_overrides[get_current_user] = lambda: mock_user
    return app


def test_calculate_impact_pc_unit_known_food():
    client = TestClient(make_app())

    response = client.post(
        "/donation/calculate-impact",
        json={"items": [{"name": "egg", "quantity": 12, "unit": "pc"}]},
    )

    assert response.status_code == 200
    data = response.json()
    # 12 eggs * 70 cal = 840 cal / 600 cal per meal = 1.4 meals
    assert data["items_breakdown"][0]["meals"] == 1.4
    assert data["total_meals"] == 1.4


def test_calculate_impact_lbs_unit_known_food():
    client = TestClient(make_app())

    response = client.post(
        "/donation/calculate-impact",
        json={"items": [{"name": "rice", "quantity": 2, "unit": "lbs"}]},
    )

    assert response.status_code == 200
    data = response.json()
    # 2 lbs * 1640 cal/lb = 3280 cal / 600 = 5.5 meals (rounded)
    assert data["items_breakdown"][0]["pounds"] == 2.0
    assert data["total_meals"] > 0


def test_calculate_impact_can_unit():
    client = TestClient(make_app())

    response = client.post(
        "/donation/calculate-impact",
        json={"items": [{"name": "canned beans", "quantity": 3, "unit": "can"}]},
    )

    assert response.status_code == 200
    data = response.json()
    # 3 cans * 350 cal = 1050 cal / 600 = 1.75 -> 1.8 meals
    assert data["items_breakdown"][0]["meals"] == 1.8


def test_calculate_impact_unknown_food_uses_fallback():
    client = TestClient(make_app())

    response = client.post(
        "/donation/calculate-impact",
        json={"items": [{"name": "totally unrecognized grocery item", "quantity": 1, "unit": "lbs"}]},
    )

    assert response.status_code == 200
    data = response.json()
    # falls back to 400 cal/lb -> 400 / 600 = 0.7 meals (rounded)
    assert data["items_breakdown"][0]["meals"] == 0.7


def test_calculate_impact_multiple_items_sum_correctly():
    client = TestClient(make_app())

    response = client.post(
        "/donation/calculate-impact",
        json={
            "items": [
                {"name": "egg", "quantity": 12, "unit": "pc"},
                {"name": "rice", "quantity": 2, "unit": "lbs"},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["items_breakdown"]) == 2
    expected_total = round(
        data["items_breakdown"][0]["meals"] + data["items_breakdown"][1]["meals"], 1
    )
    # total_meals is the sum of unrounded per-item meals, so allow for small rounding drift
    assert abs(data["total_meals"] - expected_total) <= 0.1


def test_calculate_impact_empty_items_returns_zero():
    client = TestClient(make_app())

    response = client.post("/donation/calculate-impact", json={"items": []})

    assert response.status_code == 200
    data = response.json()
    assert data["total_meals"] == 0.0
    assert data["total_pounds"] == 0.0
    assert data["items_breakdown"] == []


def test_calculate_impact_co2_derived_from_pounds():
    client = TestClient(make_app())

    response = client.post(
        "/donation/calculate-impact",
        json={"items": [{"name": "rice", "quantity": 2, "unit": "lbs"}]},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["co2_saved_lbs"] == round(data["total_pounds"] * 3.8, 2)


def test_calculate_impact_requires_auth():
    """POST /donation/calculate-impact without a token returns 401 (auth applied at app.main inclusion)."""
    from app.main import app as main_app
    client = TestClient(main_app)

    response = client.post("/donation/calculate-impact", json={"items": []})
    assert response.status_code == 401
