
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
  label: "SD-WAN Status",
  href: "pages/sdwan-status.html",
  icon: "⌁",
  roles: ["Admin", "Staff"],
  activeKey: "sdwan-status.html"
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
