import "dotenv/config";

const BICTORYS_API_URL = process.env.BICTORYS_API_URL;
const BICTORYS_API_KEY = process.env.BICTORYS_API_KEY;

async function main() {
  console.log("BICTORYS_API_URL:", BICTORYS_API_URL);
  console.log("BICTORYS_API_KEY present:", !!BICTORYS_API_KEY);

  const txnId = "be231f1e-190e-41d1-bf00-57866b4a599e";

  // Test different endpoint patterns
  const endpoints = [
    `${BICTORYS_API_URL}/pay/v1/charges/${txnId}`,
    `${BICTORYS_API_URL}/pay/v1/transactions/${txnId}`,
    `${BICTORYS_API_URL}/v1/charges/${txnId}`,
    `${BICTORYS_API_URL}/pay/v1/charges?transactionId=${txnId}`,
  ];

  for (const url of endpoints) {
    console.log(`\n--- Testing: ${url} ---`);
    try {
      const res = await fetch(url, {
        headers: { "X-Api-Key": BICTORYS_API_KEY! },
      });
      console.log(`Status: ${res.status}`);
      const text = await res.text();
      console.log(`Body: ${text.slice(0, 500)}`);
    } catch (err) {
      console.log(`Error: ${err}`);
    }
  }
}

main();
