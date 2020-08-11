$(() => {
  const courseId = window.location.search.replace('?_id=', '');
  doAjax(`/api/content/${courseId}`, { method: 'get' }, course => {
    doAjax(`/api/content/query`, { method: 'post', data: { _courseId: courseId } }, courseItems => {
      setChildrenRecursive(course, courseItems);
      $('.content').html(renderRecursive(course));
    });
  });
});
function setChildrenRecursive(rootItem, items) {
  rootItem.children = items.filter(i => i._parentId === rootItem._id);
  rootItem.children.forEach(c => setChildrenRecursive(c, items));
}
function renderRecursive(contentItem) {
  const { _component, _id, _layout, _type, displayTitle } = contentItem;
  return `<div class="contentItem ${_type} ${_layout || ''}">` +
    `<div class="header">` +
      `<span class="_type">${_type}</span>` +
      `<span class="_component">${_component || ''}</span>` +
      `<span class="_id">${_id}</span>` +
    `</div>` +
    `<div class="inner">` +
      `<div class="title">${displayTitle}</div>` +
      contentItem.children.reduce((m,c) => `${m}${renderRecursive(c)}`, '') +
    `</div>` +
  `</div>`;
}
function doAjax(url, options, doneCb = () => {}, failCb = jqXhr => console.log(jqXhr.responseJSON.message)) {
  $.ajax(url, options)
    .done(doneCb)
    .fail(failCb);
}