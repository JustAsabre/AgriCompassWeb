import { storage } from "../server/storage.js";
import bcrypt from "bcryptjs";

async function seedInitialAdmin() {
  try {
    console.log("Checking for existing admin users...");

    // Check if admin already exists by email
    const adminEmail = "rasabre211@gmail.com";
    const existingAdmin = await storage.getUserByEmail(adminEmail);

    if (existingAdmin) {
      console.log("Admin user already exists!");
      console.log("Email:", existingAdmin.email);
      console.log("Full Name:", existingAdmin.fullName);
      console.log("Role:", existingAdmin.role);
      
      // Update to admin role if not already
      if (existingAdmin.role !== "admin") {
        console.log("Updating user role to admin...");
        await storage.updateUser(existingAdmin.id, { 
          role: "admin", 
          verified: true,
          emailVerified: true 
        });
        console.log("✅ User updated to admin role!");
      }
      return;
    }

    console.log("Creating initial admin user...");

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash("TELLnobody00211", 10);

    const adminUser = {
      fullName: "Richard Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin" as const,
      verified: true,
      emailVerified: true,
      phone: null,
      region: null,
      resetToken: null,
      resetTokenExpiry: null,
    };

    const newAdmin = await storage.createUser(adminUser);

    console.log("\n✅ Initial admin user created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Email:    rasabre211@gmail.com");
    console.log("Password: TELLnobody00211");
    console.log("Role:     admin");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  Please change the password after first login!");

  } catch (error) {
    console.error("❌ Error seeding initial admin:", error);
    process.exit(1);
  }
}

// Run the seeding script
seedInitialAdmin().then(() => {
  console.log("\n✅ Admin seeding completed.");
  process.exit(0);
});