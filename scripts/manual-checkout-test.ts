
// import { apiRequest } from "../client/src/lib/queryClient";
// import fetch from "node-fetch"; // Node 18+ has global fetch

// Mock browser environment for apiRequest if needed, or just use fetch directly
const API_URL = "https://agricompass.vercel.app";
const EMAIL = "buyer_fix_test_1719600000@example.com";
const PASSWORD = "Password123!";

async function runTest() {
    console.log("Starting manual checkout test...");

    // 1. Login
    console.log("Logging in...");
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: EMAIL, password: PASSWORD }),
    });

    if (!loginRes.ok) {
        console.error("Login failed:", loginRes.status, await loginRes.text());
        return;
    }

    const cookie = loginRes.headers.get("set-cookie");
    console.log("Login successful. Cookie:", cookie);

    // 2. Add to Cart (Need a listing ID, assume one exists or fetch listings first)
    console.log("Fetching listings...");
    const listingsRes = await fetch(`${API_URL}/api/listings`, {
        headers: { Cookie: cookie || "" },
    });
    const listings = await listingsRes.json();
    if (!listings || listings.length === 0) {
        console.error("No listings found.");
        return;
    }
    const listing = listings[0];
    console.log(`Adding listing ${listing.id} to cart...`);

    const addToCartRes = await fetch(`${API_URL}/api/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie || "" },
        body: JSON.stringify({ listingId: listing.id, quantity: 1 }),
    });

    if (!addToCartRes.ok) {
        console.error("Add to cart failed:", await addToCartRes.text());
        return;
    }
    console.log("Added to cart.");

    // 3. Checkout
    console.log("Attempting checkout...");
    const checkoutRes = await fetch(`${API_URL}/api/orders/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie || "" },
        body: JSON.stringify({
            deliveryAddress: "Manual Test Address",
            notes: "Test order",
            autoPay: false
        }),
    });

    if (checkoutRes.ok) {
        console.log("Checkout SUCCESS:", await checkoutRes.json());
    } else {
        console.error("Checkout FAILED:", checkoutRes.status, await checkoutRes.text());
    }
}

runTest().catch(console.error);
