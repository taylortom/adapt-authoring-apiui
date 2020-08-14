$(() => {
  $('#navigation').css('top', $('.header').height());

  checkAuth();
  fetchApi();
  renderCourseSelect();

  $('button[name=authcheck]').click(checkAuth);
  $('button[name=recheckauth]').click(checkAuth);
  $('button[name=purge]').click(clearSession);
  $('button[name=close]').click(hideSnack);
  $('button[name=request]').click(sendRequest);
  $('button[name=coursemap]').click(viewCourseMap);
  $('button[name=revisions]').click(getRevisions);
  $('button[name=refresh]').click(refresh);
  $('button.auth').click(authenticate);

  $('select[name="api"]').change(updateApiOptions);
});
function checkAuth(callback) {
  $('button[name=purge]').hide();
  $('button[name=recheckauth]').hide();
  doAjax('/api/auth/check', { method: 'get' }, data => {
    const typeText = data.type === 'local' ? 'username/password' : data.type;
    $('.authcheck').removeClass('deny').addClass(`allow`);
    $('.authcheck .text').html(`Authenticated successfully as <b>${data.sub}</b> using ${typeText}`);
    $('button[name=purge]').show();
  }, error => {
    $('.authcheck').removeClass('allow').addClass(`deny`);
    $('.authcheck .text').html(`Not authenticated with the API.`);
    $('button[name=recheckauth]').show();
  });
}
function fetchApi() {
  doAjax('/api', { method: 'get' }, data => {
    const o = window.location.origin;
    const endpoints = Object.entries(data).reduce((m,[k,u]) => {
      u.forEach(e => m.push({ name: k.replace('_endpoints', '').replace('_', '/'), url: e.url, methods: e.accepted_methods }));
      return m;
    }, []).sort((a,b) => a.url.localeCompare(b.url));

    const $select = $('select[name="api"]');
    const $tab = $('<table><tr><th>URL</th><th>Accepted methods</th></tr></table>');

    $select.append(`<option selected disabled>Select an endpoint</option>`);

    endpoints.forEach(({ name, url, methods }) => {
      const relUrl = url.replace(o, '');
      $tab.append(`<tr><td>${url.replace(name, `<b>${name}</b>`)}</td><td>${methods.join(', ').toUpperCase()}</td></tr>`);
      methods.forEach(m => {
        $select.append(`<option data-http-method="${m}" data-url="${url}" data-rel-url="${relUrl}">${relUrl} ${m.toUpperCase()}</option>`);
      });
    });
    $('.apiMap .endpoints').append($tab);
  });
}
function authenticate(e) {
  e.preventDefault();
  switch($(e.currentTarget).attr('name')) {
    case 'local':
      doAjax('/api/auth/local', { method: 'post', data: $('.local form').serialize(), contentType: 'application/x-www-form-urlencoded' });
      break;
    case 'github':
      window.location = '/api/auth/github';
      break;
  }
}
function clearSession(e) {
  doAjax('/api/session/clear', { method: 'post' });
}
function sendRequest() {
  $('#output textarea').height(0).html('');
  $('#output').hide();
  hideSnack();

  const url = $('.request input[name=url]').val();
  const method = $('.request input[name=method]:checked').val();

  if(!url) return showSnack('Must specify request URL', false);

  try {
    const dataVal = $('.request form textarea[name=data]').val();
    const data = dataVal && JSON.parse(dataVal) && dataVal;

    doAjax(url, { method, data, contentType: 'application/json' }, (data, textStatus, jqXhr) => {
      updateOutput(`Status ${jqXhr.status}: ${jqXhr.statusText}\n\n${JSON.stringify(data, null, 2)}`);
    }, (jqXhr) => {
      updateOutput(`${jqXhr.status}: ${jqXhr.statusText}\n${JSON.stringify(jqXhr.responseJSON, null, 2) || ''}`);
    });
  } catch(e) {
    showSnack('Failed to parse request data', false);
    console.log(e);
  }
}
function renderCourseSelect() {
  doAjax(`/api/content?_type=course`, { method: 'get' }, courses => {
    const $select = $('select[name="courses"]');
    $select.append(`<option selected disabled>Select a course</option>`);
    courses.forEach(({ _id, displayTitle }) => {
      $select.append(`<option data-id="${_id}">${displayTitle} (${_id})</option>`);
    });
  }, () => $('#revisions').hide());
}
function viewCourseMap() {
  const id = $('.coursemap select[name=courses]').children("option:selected").attr('data-id');
  window.open(`${window.location.origin}/apiui/course?_id=${id}`);
}
function getRevisions() {
  $('#revisionsOutput').empty();
  const id = $('.revisions select[name=courses]').children("option:selected").attr('data-id');
  if(!id) return showSnack('Must specify course ID', false);
  doAjax(`/api/vcs/course/revisions/${id}`, { method: 'get' }, ({ course, revisions }) => {
    if(!revisions)  {
      $('#revisionsOutput').html('<p style="text-align:center;">No revisions for course<p>');
    } else {
      revisions.forEach((r,i) => $('#revisionsOutput').append(revisionDiv(r, course, i)));
      $('button[name=revert]').click(revertRevision);
      $('#revisionsOutput').show();
    }
  });
}
function revisionDiv({ _id, action, changes, timestamp }, course, index) {
  return `<div class="revision">` +
      `<details>` +
        `<summary>#${index+1} <span class="action">${action}</span> <span class="targettype">${course.displayTitle}</span><span class="timestamp">${formatDate(timestamp)}</span></summary>` +
        `<div class="inner">` +
          `<b>${changes.length} change${changes.length > 1 ? 's' : ''}</b>` +
            `<div class="inner">` +
              `${changesDiv(changes)}</div>` +
              `<button name="revert" data-id="${_id}" data-course="${course._id}">Undo this revision</button>` +
              `<button name="revert" data-id="${_id}" data-course="${course._id}" data-recursive="true">Revert back to this revision</button>` +
        `</div>` +
      `</details>` +
  `</div>`;
}
function changesDiv(changes) {
  let html = '';
  changes.forEach(c => {
    html += `<li>${c.target.type}</li>`;
  });
  return `<ul>${html}</ul>`;
}
function formatDate(dateString) {
  return new Date(dateString).toLocaleString('en-gb');
}
function formatDiff(data, key) {
  if(Array.isArray(data)) { // primitive value
    let label = '';
    if(key) label = `<b>${key}</b>: `;
    switch(data.length) {
      case 1:
        label += typeof data[0] === 'object' ? `added everything!` : `added <span class="value">${data[0]}</span>`;
        break;
      case 2:
        label += `<span class="value">${data[0]}</span> changed to <span class="value">${data[1]}</span>`;
        break;
      case 3:
        label += `removed`;
        break;
    }
    return `<li>${label}</li>`;
  } else if(data._t === 'a') { // array
    let children = '';
    Object.entries(data).forEach(([i,val]) => {
      if(i === '_t') return;
      const label = i[0] === '_' ?  `removed item at ${i.slice(1)}` : `added <span class="value">${val}</span> at ${i}`;
      children += `<li>${label}</li>`;
    });
    return `<ul>${children}</ul>`;
  } else { // nested object
    const entries = Object.entries(data);
    return entries.reduce((m,[k,v]) => `${m}${formatDiff(v,k)}`, '');
  }
}
function revertRevision(e) {
  const revision = $(e.currentTarget).attr('data-id');
  const recursive = $(e.currentTarget).attr('data-recursive') === 'true';
  doAjax(`/api/vcs/course/revert/${revision}?recursive=${recursive}`, { method: 'post' }, () => {
    showSnack(`Successfully reverted course`);
    getRevisions();
  });
}
function refresh() {
  window.location = window.location;
}
function doAjax(url, options, doneCb = refresh, failCb = jqXhr => showSnack(jqXhr.responseJSON.message, false)) {
  if(options.data && !options.contentType) {
    options.contentType = 'application/json';
    options.data = JSON.stringify(options.data);
  }
  $.ajax(url, options)
    .done(doneCb)
    .fail(failCb);
}
function updateApiOptions(e) {
  const $o = $("option:selected", this);
  $(`input[name="method"]`).prop('checked', false)
  $(`input[name="method"][value="${$o.attr('data-http-method')}"]`).prop('checked', true);
  $('input[name="url"]').val($o.attr('data-rel-url'));
}
function updateOutput(html) {
  $('#output textarea').html(html);
  $('#output').show();
  $('#output textarea').height($('#output textarea')[0].scrollHeight);
  $([document.documentElement, document.body]).animate({ scrollTop: $("#output").offset().top }, 1000);
}
function showSnack(text, success=true) {
  $(`.snack .text`).html(text);
  $(`.snack`).removeClass(success ? 'deny' : 'allow').addClass(success ? 'allow' : 'deny');
  $('.snack button[name=purge]').toggle(success);
  $('.snack button[name=refresh]').toggle(!success);
  $(`.snack`).fadeIn();
}
function hideSnack() {
  $('.snack').fadeOut();
}