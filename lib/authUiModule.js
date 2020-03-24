const { AbstractModule } = require('adapt-authoring-core');
const path = require('path');

class AuthUiModule extends AbstractModule {
  /** @override */
  constructor(app, pkg) {
    super(app, pkg);
    this.init();
  }
  async init() {
    const server = await this.app.waitForModule('server');
    server.root.addRoute({
      route: 'auth',
      handlers: { get: (req, res, next) => res.render(path.join(__dirname, '../views/auth')) }
    });
    this.setReady();
  }
}

module.exports = AuthUiModule;
