
window.TREASURY_MENU = [
  {
    section: "WORKSPACE",
    items: [
      {
        label: "Dashboard",
        href: "dashboard.html",
        icon: "⌂",
        roles: ["Admin", "Staff"],
        activeKey: "dashboard.html"
      },
      {
        label: "Employee Enroll",
        href: "pages/employee-details.html",
        icon: "♙",
        roles: ["Admin", "Staff"],
        activeKey: "employee-details.html"
      },
      {
        label: "Employee Report",
        href: "pages/employee-report.html",
        icon: "▥",
        roles: ["Admin", "Staff"],
        activeKey: "employee-report.html"
      }
    ]
  }

  /*
  // TEMPORARILY DISABLED: ADMINISTRATION SECTION
  ,
  {
    section: "ADMINISTRATION",
    items: [
      {
        label: "User Management",
        href: "pages/users.html",
        icon: "♙",
        roles: ["Admin"],
        activeKey: "users.html"
      }
    ]
  }
  */
];
