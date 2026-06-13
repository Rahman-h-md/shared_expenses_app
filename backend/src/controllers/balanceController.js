const { calculateGroupBalances } = require('../services/balanceEngine');

/**
 * Get the calculated balances and suggested settlements for a group
 * @route GET /api/v1/groups/:id/balances
 */
const getGroupBalances = async (req, res, next) => {
   try {
      const groupId = req.params.id;
      
      const balanceReport = await calculateGroupBalances(groupId);
      
      res.status(200).json(balanceReport);
   } catch (err) {
      next(err);
   }
};

module.exports = {
    getGroupBalances
};
