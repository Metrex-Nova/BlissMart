"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem("user");

    if (!userData) {
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userData);

      // Redirect to role-specific dashboard - Fixed case sensitivity
      switch (user.role?.toUpperCase()) {
        case "RETAILER":
          router.push("/dashboard/retailer");
          break;
        case "WHOLESALER":
          router.push("/dashboard/wholesaler");
          break;
        case "CUSTOMER":
          router.push("/dashboard/customer");
          break;
        default:
          router.push("/login");
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">
          Redirecting to your dashboard...
        </p>
      </div>
    </div>
  );
}
