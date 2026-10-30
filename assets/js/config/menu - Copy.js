
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
        label: "Cash Stock",
        href: "pages/cash-stock.html",
        icon: "▤",
        roles: ["Admin", "Staff"],
        activeKey: "cash-stock"
      },
      {
        label: "Network Status",
        href: "pages/network-status.html",
        icon: "⌁",
        roles: ["Admin", "Staff"],
        activeKey: "network-status"
      },
      {
        label: "Pension Services",
        href: "pages/pension.html",
        icon: "▣",
        roles: ["Admin", "Staff"],
        activeKey: "pension"
      },
      {
        label: "Reports",
        href: "pages/reports.html",
        icon: "▥",
        roles: ["Admin", "Staff"],
        activeKey: "reports"
      },
	  {
        label: "employee-details",
         href: "pages/employee-details.html",
          icon: "⌁",
         roles: ["Admin", "Staff"],
         activeKey: "employee-details.html"
     },
	 {
        label: "employee-report",
         href: "pages/employee-report.html",
          icon: "⌁",
         roles: ["Admin", "Staff"],
         activeKey: "employee-report.html"
     }

    ]
  },
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
];
