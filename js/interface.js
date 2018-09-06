var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData() || {};
var organizationId = Fliplet.Env.get('organizationId');
var widgetId = Fliplet.Widget.getDefaultId();
var allDataSources = [];

// This is no longer necessary
$(document).on('change', '.hidden-select', function(){
  var selectedValue = $(this).val();
  var selectedText = $(this).find("option:selected").text();
  $(this).parents('.select-proxy-display').find('.select-value-proxy').text(selectedText);
});

var $dataSources = $('[name="dataSource"]');
var $emailAddress = $('[name="emailAddress"]');
var $firstName = $('[name="firstName"]');
var $lastName = $('[name="lastName"]');
var $fullName = $('[name="fullName"]');
var $avatar = $('[name="avatar"]');
var $titleName = $('[name="titleName"]');

// Set link action to screen by default
if (!data.securityLinkAction) {
  data.securityLinkAction = {
    action: 'screen',
    page: '',
    transition: 'fade',
    options: {
      hideAction: true
    }
  };
}

var linkSecurityProvider = Fliplet.Widget.open('com.fliplet.link', {
  // If provided, the iframe will be appended here,
  // otherwise will be displayed as a full-size iframe overlay
  selector: '#security-screen',
  // Also send the data I have locally, so that
  // the interface gets repopulated with the same stuff
  data: data.securityLinkAction,
  // Events fired from the provider
  onEvent: function (event, data) {
    if (event === 'interface-validate') {
      // Why use data.isValid === true instead of just data.isValid or !!data.isValid?
      Fliplet.Widget.toggleSaveButton(data.isValid === true);
    }
  }
});

linkSecurityProvider.then(function (result) {
  data.securityLinkAction = result.data;
  save(true);
});

$('form').submit(function (event) {
  event.preventDefault();
  linkSecurityProvider.forwardSaveRequest();
});

$('#manage-data').on('click', manageAppData);

$('#show-seperate-name-fields').on('click', function() {
  $('.full-name-field').addClass('hidden');
  $('.first-last-names-holder').removeClass('hidden');
});

$('#show-full-name-field').on('click', function() {
  $('.full-name-field').removeClass('hidden');
  $('.first-last-names-holder').addClass('hidden');
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  $('form').submit();
});

$dataSources.on('change', function() {
  var selectedDataSourceId = $(this).val();
  if (selectedDataSourceId === 'none') {
    $('#manage-data').addClass('hidden');
    $('.column-selection').removeClass('show');
    return;
  }

  if (selectedDataSourceId === 'new') {
    $('#manage-data').addClass('hidden');
    createDataSource();
    return;
  }

  $('.column-selection').addClass('show');
  getColumns(selectedDataSourceId);
});

Fliplet.Studio.onMessage(function(event) {
  if (event.data && event.data.event === 'overlay-close') {
    reloadDataSources(event.data.data.dataSourceId);
  }
});

function save(notifyComplete) {
  // Push notifications are always enabled for the chat
  data.pushNotifications = true;

  data.dataSourceId = $dataSources.val();
  data.crossLoginColumnName = $emailAddress.val();
  data.fullNameColumnName = $fullName.val();
  data.firstNameColumnName = $firstName.val();
  data.lastNameColumnName = $lastName.val();
  data.titleNameColumnName = $titleName.val();
  data.avatarColumnName = $avatar.val();

  Fliplet.Widget.save(data).then(function () {
    if (notifyComplete) {
      Fliplet.Widget.complete();
      window.location.reload();
    } else {
      Fliplet.Studio.emit('reload-widget-instance', widgetId);
    }
  });
}

function getColumns(dataSourceId) {
  // Change this if-else the other way round and avoid using else so that there's less indentation
  if (dataSourceId && dataSourceId !== '') {
    $('#manage-data').removeClass('hidden');

    Fliplet.DataSources.getById(dataSourceId, {
      cache: false
    }).then(function (dataSource) {
      // Prepare all the HTML so that the DOM is changed as little as possible. You should only need to call .html() once for each field
      $emailAddress.html('<option value="">-- Select a field</option>');
      $fullName.html('<option value="">-- Select a field</option>');
      $firstName.html('<option value="">-- Select a field</option>');
      $lastName.html('<option value="">-- Select a field</option>');
      $avatar.html('<option value="">-- Select a field</option>');
      $titleName.html('<option value="">-- Select a field</option>');

      dataSource.columns.forEach(function (c) {
        $emailAddress.append('<option value="' + c + '">' + c + '</option>');
        $fullName.append('<option value="' + c + '">' + c + '</option>');
        $firstName.append('<option value="' + c + '">' + c + '</option>');
        $lastName.append('<option value="' + c + '">' + c + '</option>');
        $avatar.append('<option value="' + c + '">' + c + '</option>');
        $titleName.append('<option value="' + c + '">' + c + '</option>');
      });

      if (data.crossLoginColumnName) {
        $emailAddress.val(data.crossLoginColumnName);
      }
      if (data.fullNameColumnName) {
        $fullName.val(data.fullNameColumnName);
      }
      if (data.firstNameColumnName) {
        $firstName.val(data.firstNameColumnName);
      }
      if (data.lastNameColumnName) {
        $lastName.val(data.lastNameColumnName);
      }
      if (data.avatarColumnName) {
        $avatar.val(data.avatarColumnName);
      }
      if (data.titleNameColumnName) {
        $titleName.val(data.titleNameColumnName);
      }

      // These aren't necessary if they're only there to make sure the .select-value-proxy values are updated
      $emailAddress.trigger('change');
      $fullName.trigger('change');
      $firstName.trigger('change');
      $lastName.trigger('change');
      $avatar.trigger('change');
      $titleName.trigger('change');

      // $.fn.prop() should be used with true and false when setting values, e.g. $fields.prop('disabled', false). See http://api.jquery.com/prop/#prop2
      // If you create a collection like $fields = $('[name="dataSource"], [name="emailAddress"]') etc. then you can do this all in one go like $fields.prop('disabled', '');
      $emailAddress.prop('disabled', '');
      $fullName.prop('disabled', '');
      $firstName.prop('disabled', '');
      $lastName.prop('disabled', '');
      $avatar.prop('disabled', '');
      $titleName.prop('disabled', '');
    });
  } else {
    $('#manage-data').addClass('hidden');
  }
}

function createDataSource() {
  event.preventDefault();
  var name = prompt('Please type a name for your data source:');

  if (name === null) {
    $('#manage-data').addClass('hidden');
    $dataSources.val('none').trigger('change');
    return;
  }

  if (name === '') {
    $('#manage-data').addClass('hidden');
    $dataSources.val('none').trigger('change');
    alert('You must enter a data source name');
    return;
  }

  Fliplet.DataSources.create({
    name: name,
    organizationId: Fliplet.Env.get('organizationId')
  }).then(function(ds) {
    allDataSources.push(ds);
    $dataSources.append('<option value="' + ds.id + '">' + ds.name + '</option>');
    $dataSources.val(ds.id).trigger('change');
  });
}

function manageAppData() {
  var dataSourceId = $dataSources.val();
  Fliplet.Studio.emit('overlay', {
    name: 'widget',
    options: {
      size: 'large',
      package: 'com.fliplet.data-sources',
      title: 'Edit Data Sources',
      classes: 'data-source-overlay',
      data: {
        context: 'overlay',
        dataSourceId: dataSourceId
      }
    }
  });
}

function reloadDataSources(dataSourceId) {
  return Fliplet.DataSources.get({
    type: null
  }, {
    cache: false
  }).then(function(results) {
    allDataSources = results;
    $dataSources.html('<option value="none">-- Select a data source</option><option disabled>------</option><option value="new">Create a new data source</option><option disabled>------</option>');
    allDataSources.forEach(function (d) {
      $dataSources.append('<option value="' + d.id + '">' + d.name + '</option>');
    });

    if (dataSourceId) {
      $dataSources.val(dataSourceId);
    }
    $dataSources.trigger('change');
  });
}

// Load the data source for the contacts
Fliplet.DataSources.get({
  organizationId: organizationId
}).then(function (dataSources) {
  allDataSources = dataSources;
  dataSources.forEach(function (d) {
    $dataSources.append('<option value="' + d.id + '">' + d.name + '</option>');
  });

  if (data.dataSourceId) {
    $dataSources.val(data.dataSourceId);
  }
  $dataSources.trigger('change');

  $dataSources.prop('disabled', '');
});
