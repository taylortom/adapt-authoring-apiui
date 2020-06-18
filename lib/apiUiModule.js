const { AbstractModule } = require('adapt-authoring-core');
const path = require('path');
/** @ignore */
class ApiUiModule extends AbstractModule {
  /** @override */
  constructor(app, pkg) {
    super(app, pkg);
    this.init();
  }
  /** @ignore */
  async init() {
    const server = await this.app.waitForModule('server');
    server.root.addRoute({
      route: '/',
      handlers: { get: this.handlePage.bind(this) }
    });
    this.setReady();
  }
  /** @ignore */
  handlePage(req, res, next) {
    res.render(path.join(__dirname, '../views/index'));
  }
}

module.exports = ApiUiModule;
