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
    server.root.addMiddleware(server.static(path.join(__dirname, '..', 'public')));
    server.root.addRoute({
      route: '/',
      handlers: { get: this.handlePage('index') }
    }, {
      route: '/course',
      handlers: { get: this.handlePage('course') }
    });
    this.setReady();
  }
  /** @ignore */
  handlePage(templateName) {
    return (req, res, next) => res.render(path.join(__dirname, `../views/${templateName}`));
  }
}

module.exports = ApiUiModule;
