const { createMachine } = require('xstate');
const workflowConfig = require('./workflow.json');

const scanEntryMachine = createMachine({
  ...workflowConfig,
  // Ensure context is initialized if not provided by input (though we set it in controller)
  context: ({ input }) => ({
    user: input?.user,
    entry: input?.entry
  }),
}, {
  guards: {
    checkRole: ({ context }, params) => {
      const userRole = context.user.role;
      const requiredRole = params.role;
      return userRole === requiredRole || userRole === 'admin';
    },
    canReject: ({ context }) => {
      const allowedRoles = ['admin', 'supervisor', 'center_manager', 'project_manager', 'finance_manager'];
      return allowedRoles.includes(context.user.role);
    }
  }
});

module.exports = scanEntryMachine;
