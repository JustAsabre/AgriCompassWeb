import { storage } from "../server/storage.js";
// Simple hash function for seeding (not for production)
async function simpleHash(password: string): Promise<string> {
  // This is just for seeding - in production use proper bcrypt
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function seedInitialAdmin() {
  try {
    console.log("Checking for existing admin users...");

    // Check if any admin already exists
    const allUsers = await storage.getAllUsers();
    const existingAdmin = allUsers.find(user => user.role === "admin");

    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.username);
      return;
    }

    console.log("Creating initial admin user...");

    // Create initial admin user
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "admin123";
    const hashedPassword = await simpleHash(adminPassword);

    const adminUser = {
      username: "admin",
      email: "admin@agricompass.com",
      password: hashedPassword,
      role: "admin",
      verified: true,
      phoneNumber: null,
      location: null,
      profileImageUrl: null,
      bio: "Initial admin user",
      lastLogin: null,
      createdAt: new Date(),
    };

    // Use the storage method to create user (assuming it exists, or we need to add it)
    // For now, we'll directly add to the users map since MemStorage doesn't have a createUser method
    const adminId = "admin-" + Date.now();
    (storage as any).users.set(adminId, { ...adminUser, id: adminId });

    console.log("Initial admin user created successfully!");
    console.log("Username: admin");
    console.log("Email: admin@agricompass.com");
    console.log("Password:", adminPassword);
    console.log("Please change the password after first login!");

  } catch (error) {
    console.error("Error seeding initial admin:", error);
    process.exit(1);
  }
}

// Run the seeding script
seedInitialAdmin().then(() => {
  console.log("Admin seeding completed.");
  process.exit(0);
});