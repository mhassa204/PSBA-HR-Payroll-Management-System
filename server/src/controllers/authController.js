const prisma = require("../prismaClient"); // adjust to your setup
const { decrypt } = require("../utils/cryptoUtil");

const authController = {
  login: async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Email and password required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || decrypt(user.password) !== password) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    // Set session values
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    res.json({ success: true, message: "Logged in", user: req.session.user });
  },

  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err)
        return res.status(500).json({ success: false, error: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ success: true, message: "Logged out" });
    });
  },

  me: (req, res) => {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, error: "Not authenticated" });
    }
    res.json({ success: true, user: req.session.user });
  },
};

module.exports = authController;
