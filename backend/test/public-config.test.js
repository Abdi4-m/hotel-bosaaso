const assert = require("node:assert/strict");
const test = require("node:test");
const app = require("../src/app");

test("public config returns the same tax rate used for order creation", async (t) => {
  const previousTaxRate = process.env.ORDER_TAX_RATE;
  const originalConsoleError = console.error;
  process.env.ORDER_TAX_RATE = "0.0685";
  console.error = () => {};
  const server = app.listen(0, "127.0.0.1");
  t.after(async () => {
    console.error = originalConsoleError;
    if (previousTaxRate === undefined) delete process.env.ORDER_TAX_RATE;
    else process.env.ORDER_TAX_RATE = previousTaxRate;
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/config`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { orderTaxRate: 0.0685 });

  process.env.ORDER_TAX_RATE = "invalid";
  const invalidResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/config`);
  assert.equal(invalidResponse.status, 500);
  assert.deepEqual(await invalidResponse.json(), { error: "Order tax rate configuration is invalid" });
});
