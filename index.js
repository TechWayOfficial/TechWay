function pesquisacep(valor) {
    var settings = {
        "url": "https://viacep.com.br/ws/" + valor + "/json/",
        "method": "GET",
        "timeout": 0,

    };

    $.ajax(settings).done(function (response) {
        $("#Rua").val(response.logradouro)
        $("#Bairro").val(response.bairro)
        $("#Cidade").val(response.localidade)
        $("#UF").val(response.uf)
    });
}

function carregarNoMapa() {
    $("#map-container").show()
    geocoder = new google.maps.Geocoder();
    rua = $("#Rua").val();
    bairro = $("#Bairro").val();
    Cidade = $("#Cidade").val();
    numero = $("#NUM").val();

    endereco = rua + " " + numero + "," + bairro + "," + Cidade;
    geocoder.geocode({ 'address': endereco + ', Brasil', 'region': 'BR' }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            if (results[0]) {
                var latitude = results[0].geometry.location.lat();
                var longitude = results[0].geometry.location.lng();
                $("#controlemaps").attr("style", "margin-top:350px;")
                initMap(latitude, longitude)
            }
        }
    });
}

function initMap(lat1, long) {
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 17,
        center: { lat: lat1, lng: long },
    });

    map.controls[google.maps.ControlPosition.TOP_CENTER].push(
        document.getElementById("info")
    );
    marker = new google.maps.Marker({
        map,
        draggable: false,
        position: { lat: lat1, lng: long },
    });
}

function calendario(arr, pacientes) {

    let eventos = []

    arr.forEach(item => {
        let data = item['datahora'].split(" ")
        let horas = data[1].split(":")
        let soma = moment(horas[0] + ':' + horas[1], 'hh:mm').add(item['duracao'], 'minutes').format('hh:mm')
        eventos.push({
            id: item['id'],
            title: item['titulo'],
            start: item['datahora'],
            end: data[0] + " " + soma + ":00",
            color: "purple"
        })
    })

    var calendarEl = document.getElementById('calendar');

    var calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'pt-br',
        timeZone: 'UTC',
        height: 785,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        editable: true,
        dayMaxEvents: true,
        events: eventos,
        dateClick: function (info) {
            modalAgendar(info, pacientes)
        },
        eventClick: function (info) {
            modalConsulta(info, info.event.id)
        }
    });

    calendar.render();
}

function selectPacientes(pacientes) {
    var html = `<select id="swal-paciente" class="form-select"><option id="default">Selecione</option>`
    pacientes.forEach(item => {
        html += `<option value='${item.id}'>${item.nome}</option>`
    })
    html += `</select>`
    return html
}

function modalAgendar(info, pacientes) {
    (async () => {
        var select = selectPacientes(pacientes)
        if (info.dateStr.length > 10) {
            let dataFormat = info.dateStr.split('T')
            let horaFormat = dataFormat[1].split(":")
            data = dataFormat[0]
            hora = `${horaFormat[0]}:${horaFormat[1]}`
        } else {
            data = info.dateStr
            hora = "00:00"
        }
        console.log(data + " " + hora)
        const {
            value: formValues
        } = await Swal.fire({
            title: 'Agendar Consulta',
            html: `<div class="observerDiv"><label class="form-label">Título: *</label>
            <p><input id="swal-titulo" class="form-control" type="text"></p>
            <label class="form-label">Paciente: *</label>
            <p>${select}</p>
            <label class="form-label">Data e hora: *</label>
            <p><input id="swal-datahora" class="form-control" type="datetime-local" value="${data}T${hora}"></p>
            <label class="form-label">Duração: *</label>
            <p><select id="swal-duracao" class="form-select">
                    <option>Selecione</option>
                    <option value="15">15Min</option>
                    <option value="30">30Min</option>
                    <option value="45">45Min</option>
                    <option value="60">1Hr</option>
                    <option value="75">1Hr15Min</option>
                    <option value="90">1Hr30Min</option>
                </select></p>
            <label class="form-label">Descrição:</label>
            <p><textarea id="swal-desc" class="form-control" placeholder="Type your message here..." rows="4"></textarea></p><div>`,
            focusConfirm: false,
            confirmButtonText: 'Agendar',
            showCancelButton: true,
            preConfirm: () => {
                return [
                    $('#swal-titulo').val(),
                    $('#swal-paciente').val(),
                    $('#swal-datahora').val(),
                    $('#swal-duracao').val(),
                    $('#swal-desc').val()
                ]
            }
        })
        if (formValues) {

            let settings = {
                type: "POST",
                url: "../Controllers/consulta-select.php?op=4",
                data: JSON.stringify({
                    titulo: $("#swal-titulo").val(),
                    paciente: $('#swal-paciente').val(),
                    datahora: $("#swal-datahora").val(),
                    duracao: $("#swal-duracao").val(),
                    descricao: $("#swal-desc").val()
                })
            }

            $.ajax(settings).done((responseInsert) => {

                console.log(responseInsert)

                pacientes.forEach(elmt => {
                    elmt.id == $("#swal-paciente").val() ? email = elmt.email : "";
                })

                emailjs.init("tWf_dlRyGgJ6Fb-dJ");

                let stringTime = $("#swal-datahora").val().split('T')
                let stringDate = stringTime[0].split('-')

                let templateParams = {
                    paciente: $('#swal-paciente').find(":selected").text(),
                    data: stringDate[2] + '/' + stringDate[1] + '/' + stringDate[0],
                    hora: stringTime[1],
                    envio: email
                };

                emailjs.send('service_qdc8geq', 'template_8uynoyr', templateParams)
                    .then((response) => {
                        console.log('SUCCESS!', response.status, response.text)
                    }, (error) => {
                        console.log('FAILED...', error)
                    })

                if (responseInsert == 'true') {
                    Swal.fire('Cadastrado com sucesso!', '', 'success').then(() => { location.reload() })
                }
                else {
                    Swal.fire('Horário Indisponível!', '', 'error')
                }
            })

        }

    })()
}

function selectedValor(id, comparacao) {
    let valor = $(`#${id}`).find('option')
    for (var i = 1; i < valor.length; i++) {
        valor[i].value == comparacao ? $(`#${id}`).val(valor[i].value) : null;
    }
}

function modalConsulta(info, eventId) {
    (async () => {

        let settings = {
            type: "POST",
            url: "../Controllers/consulta-select.php?op=1",
            data: JSON.stringify({
                id: eventId
            })
        }

        $.ajax(settings).done((response) => {

            obj = JSON.parse(response)

            let data = obj[0].datahora.split(" ")
            let hora = data[1].split(":")
            let datahora = `${data[0]}T${hora[0]}:${hora[1]}`

            const {
                value: formValues
            } = Swal.fire({
                title: 'Consulta',
                html: `<div onMouseOver="selectedValor('swal-duracao',${obj[0].duracao})" class="observerDiv"><label class="form-label">Título:</label>
                    <p><input id="swal-titulo" class="form-control" type="text" value="${obj[0].titulo}"></p>
                    <label class="form-label">Paciente:</label>
                    <p><input id="swal-paciente" class="form-control" type="text" value="${obj[0].nome}" disabled></p>
                    <label class="form-label">Data e hora:</label>
                    <p><input id="swal-datahora" class="form-control" type="datetime-local" value="${datahora}"></p>
                    <label class="form-label">Duração:</label>
                    <p><select id="swal-duracao" class="form-select">
                            <option>Selecione</option>
                            <option value="15">15Min</option>
                            <option value="30">30Min</option>
                            <option value="45">45Min</option>
                            <option value="60">1Hr</option>
                            <option value="75">1Hr15Min</option>
                            <option value="90">1Hr30Min</option>
                        </select></p>
                    <label class="form-label">Descrição:</label>
                    <p><textarea id="swal-desc" class="form-control" placeholder="Type your message here..." rows="4">${obj[0].descricao}</textarea></p><div>`,
                focusConfirm: false,
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'Alterar',
                denyButtonText: 'Excluir',
            }).then((result) => {
                if (result.isConfirmed) {
                    let settings = {
                        type: "POST",
                        url: "../Controllers/consulta-select.php?op=3",
                        data: JSON.stringify({
                            id: eventId,
                            titulo: $("#swal-titulo").val(),
                            datahora: $("#swal-datahora").val(),
                            duracao: $("#swal-duracao").val(),
                            descricao: $("#swal-desc").val()
                        })
                    }

                    $.ajax(settings).done((response) => {
                        Swal.fire('Alterado com sucesso!', '', 'success').then(() => { location.reload() })
                    })

                } else if (result.isDenied) {

                    let settings = {
                        type: "POST",
                        url: "../Controllers/consulta-select.php?op=2",
                        data: JSON.stringify({
                            id: eventId
                        })
                    }

                    $.ajax(settings).done((response) => {
                        emailjs.init("tWf_dlRyGgJ6Fb-dJ");

                        let stringTime = $("#swal-datahora").val().split('T')
                        let stringDate = stringTime[0].split('-')

                        let templateParams = {
                            paciente: $('#swal-paciente').val(),
                            data: stringDate[2] + '/' + stringDate[1] + '/' + stringDate[0],
                            hora: stringTime[1],
                            envio: obj[0].email
                        };

                        emailjs.send('service_qdc8geq', 'template_lmujomo', templateParams)
                            .then((response) => {
                                console.log('SUCCESS!', response.status, response.text)
                            }, (error) => {
                                console.log('FAILED...', error)
                            })
                        Swal.fire('Excluído com sucesso!', '', 'success').then(() => { location.reload() })
                    })

                }
            })

        }).fail((err) => {

            console.log(err)

        })

    })()
}