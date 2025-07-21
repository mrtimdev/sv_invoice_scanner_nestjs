console.log("Console From admin.js")

$('#download-selected').on('click', function () {
  const selectedIds = $('.check-row:checked')
    .map(function () {
      return $(this).val();
    })
    .get();

  if (selectedIds.length === 0) {
    alert('Please select at least one scan to download');
    return;
  }


  let xhr = $.ajax({
    url: '/admin/scans/download-zip',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ ids: selectedIds }),
    xhrFields: {
      responseType: 'blob'
    },
    success: function (data, status, xhr) {

      const contentDisposition = xhr.getResponseHeader('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `sv-scans-${new Date().toISOString()}.zip`;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        a.remove();
      }, 100);
    },
    error: function (xhr, status) {

    }
  });
});
