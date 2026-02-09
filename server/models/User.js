// In-memory storage for users (replace with DB in production)
class UserModel {
  constructor() {
    this.users = new Map();
  }

  create(userData) {
    this.users.set(userData.id, {
      ...userData,
      balanceCoins: userData.balanceCoins || 1000, // Mock: give 1000 coins initially
      createdAt: new Date().toISOString()
    });
    return this.users.get(userData.id);
  }

  getById(userId) {
    return this.users.get(userId);
  }

  getOrCreate(userId) {
    if (!this.users.has(userId)) {
      return this.create({ id: userId });
    }
    return this.users.get(userId);
  }

  updateBalance(userId, amount) {
    const user = this.getOrCreate(userId);
    user.balanceCoins += amount;
    return user;
  }

  deductBalance(userId, amount) {
    const user = this.getOrCreate(userId);
    if (user.balanceCoins >= amount) {
      user.balanceCoins -= amount;
      return { success: true, newBalance: user.balanceCoins };
    }
    return { success: false, error: 'Insufficient balance' };
  }
}

module.exports = new UserModel();
