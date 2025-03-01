import { app, TICKER } from "../";
import request from "supertest";
import { expect } from "@jest/globals";

describe("Orderbook API Tests", () => {
  
  it("should verify initial balances", async () => {
    const res1 = await request(app).get("/balance/1");
    expect(res1.status).toBe(200);
    expect(res1.body.balances[TICKER]).toBe(10);
    
    const res2 = await request(app).get("/balance/2");
    expect(res2.status).toBe(200);
    expect(res2.body.balances[TICKER]).toBe(10);
  });

  it("should allow placing limit orders", async () => {
    await request(app).post("/order").send({
      type: "limit",
      side: "bid",
      price: 1400.1,
      quantity: 1,
      userId: "1",
    }).expect(200);

    await request(app).post("/order").send({
      type: "limit",
      side: "ask",
      price: 1400.9,
      quantity: 10,
      userId: "2",
    }).expect(200);

    await request(app).post("/order").send({
      type: "limit",
      side: "ask",
      price: 1501,
      quantity: 5,
      userId: "2",
    }).expect(200);

    const depthRes = await request(app).get("/depth");
    expect(depthRes.status).toBe(200);
    expect(depthRes.body.depth["1501"].quantity).toBe(5);
  });

  it("should maintain unchanged balances when no trades happen", async () => {
    const res = await request(app).get("/balance/1");
    expect(res.status).toBe(200);
    expect(res.body.balances[TICKER]).toBe(10);
  });

  it("should execute an order that matches existing ones", async () => {
    const res = await request(app).post("/order").send({
      type: "limit",
      side: "bid",
      price: 1502,
      quantity: 2,
      userId: "1",
    });
    expect(res.status).toBe(200);
    expect(res.body.filledQuantity).toBe(2);
  });

  it("should update the orderbook correctly", async () => {
    const depthRes = await request(app).get("/depth");
    expect(depthRes.status).toBe(200);
    expect(depthRes.body.depth["1400.9"]?.quantity).toBe(8);
  });

  it("should update balances after trade execution", async () => {
    const balance1 = await request(app).get("/balance/1");
    expect(balance1.status).toBe(200);
    expect(balance1.body.balances[TICKER]).toBe(12);
    expect(balance1.body.balances["USD"]).toBe(50000 - 2 * 1400.9);

    const balance2 = await request(app).get("/balance/2");
    expect(balance2.status).toBe(200);
    expect(balance2.body.balances[TICKER]).toBe(8);
    expect(balance2.body.balances["USD"]).toBe(50000 + 2 * 1400.9);
  });
});