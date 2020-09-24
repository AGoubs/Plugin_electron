/**
 * Plugin Mél Electron
 *
 * Plugin d'affichage de Mél dans un client Electron en lien avec le plugin Mél_archivage
 * Les messages sont téléchargés sur le poste de l'utilisateur
 * Puis copié dans un dossier configuré dans 'Mails archive' 
 * Du dossier de l'application Electron 
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */
rcmail.addEventListener('init', function (evt) {
    if (rcmail.env.iselectron) {
        window.api.send('get_archive_folder')
        window.api.receive('archive_folder', (folder) => {
            rcmail.env.local_archive_folder = folder;
            createFolder();
            displaySubfolder();
        });




    }
});



//  ----- Réaffiche les sous-dossier après archivage d'un nouveau dossier -----
window.api.receive('new_folder', (folder) => {
    displaySubfolder();
})

// ----- Ajout des mails dans la liste après archivage -----
window.api.receive('add_message_row', (row) => {
    row.date = new Date(row.date).toLocaleString('fr-FR', { timeZone: 'UTC' });
    let flags = { "seen": 1, "ctype": row.content_type, "mbox": rcmail.env.local_archive_folder + "/" + row.mbox };
    rcmail.add_message_row(row.id, row, flags, false);
})

// -----Affiche le dossier des archives -----
function createFolder() {
    let link = $('<a>').attr('href', '#')
        .attr('rel', rcmail.env.local_archive_folder)
        .attr('onClick', "chargementArchivage('')")
        .html(rcmail.env.local_archive_folder);
    console.log(rcmail.treelist);
    rcmail.treelist.insert({ id: rcmail.env.local_archive_folder, html: link, classes: ['mailbox archives_locales'] }, null);
}

// ----- Affiche les sous-dossier des archives -----
function displaySubfolder() {
    window.api.send('subfolder');
    window.api.receive('listSubfolder', (subfolders) => {
        subfolders.forEach(subfolder => {
            subfolder.relativePath = subfolder.relativePath.replace(/\\/g, "/");
            let key = subfolder.relativePath;
            let link = $('<a>').attr('href', '#')
                .attr('rel', subfolder.name)
                .attr('onClick', "chargementArchivage('" + key + "')")
                .html(subfolder.name);
            rcmail.treelist.insert({ id: rcmail.env.local_archive_folder + '/' + key, html: link, classes: ['mailbox'] }, rcmail.env.local_archive_folder);
            getChildren(subfolder);
        })
    });
}
function getChildren(parent) {
    if (parent && parent.children) {
        for (var i = 0, l = parent.children.length; i < l; ++i) {
            var child = parent.children[i];
            child.relativePath = child.relativePath.replace(/\\/g, "/");
            let key = child.relativePath;
            let link = $('<a>').attr('href', '#')
                .attr('rel', key)
                .attr('onClick', "chargementArchivage('" + key + "')")
                .html(child.name);
            rcmail.treelist.insert({ id: rcmail.env.local_archive_folder + '/' + key, html: link, classes: ['mailbox'] }, rcmail.env.local_archive_folder + '/' + parent.relativePath, 'mailbox');
            getChildren(child);
        }
    }
}

// ----- Changement de l'environnement et chargement de la liste  ----- 
function chargementArchivage(path) {
    mbox = (path == '') ? rcmail.env.local_archive_folder : rcmail.env.local_archive_folder + "/" + path;
    rcmail.env.mailbox = mbox;

    loadArchive(path);

    //Système de recherche des mails
    $("[name ='rcmqsearchform']").removeAttr('onsubmit').submit(function (e) {
        e.preventDefault();
        window.api.send('search_list', { "value": $('#quicksearchbox').val(), "subfolder": rcmail.env.mailbox.replace(rcmail.env.local_archive_folder + "/", "") });
        window.api.receive('result_search', (rows) => {
            rcmail.message_list.clear();
            if (rows.length > 0) {
                rows.forEach(row => {
                    if (row.break == 0) {
                        row.date = new Date(row.date).toLocaleString('fr-FR', { timeZone: 'UTC' });
                        let flags = { "seen": 1, "ctype": row.content_type, "mbox": rcmail.env.local_archive_folder + "/" + row.subfolder };
                        rcmail.add_message_row(row.id, row, flags, false);
                    }
                });
            }
            else {
                if (rows.break == 0) {
                    rows.date = new Date(rows.date).toLocaleString('fr-FR', { timeZone: 'UTC' });
                    let flags = { "seen": 1, "ctype": rows.content_type, "mbox": rcmail.env.local_archive_folder + "/" + rows.subfolder };
                    rcmail.add_message_row(rows.id, rows, flags, false);
                }
            }
        });
    });

    $("#searchreset").on('click', function (e) {
        e.preventDefault();
        rcmail.message_list.clear();
        loadArchive(path);
    });
}

// ----- Affiche la liste des messages d'un dossier -----
function loadArchive(path) {
    window.api.send('read_mail_dir', path)
    document.body.classList.add('busy-cursor');

    window.api.receive('mail_dir', (mails) => {
        mails.forEach((mail) => {
            if (mail.break == 0) {
                mail.date = new Date(mail.date).toLocaleString('fr-FR', { timeZone: 'UTC' });
                let flags = { "seen": 1, "ctype": mail.content_type, "mbox": mbox };
                rcmail.add_message_row(mail.id, mail, flags, false);
            }
        });
        document.body.classList.remove('busy-cursor');
    })
    if (rcmail.message_list) {
        rcmail.message_list.clear();
        delete rcmail.message_list._events;

        rcmail.message_list.addEventListener('select', function (list) {
            let uid = list.get_single_selection();

            if (uid == null && rcmail.env.mailbox != rcmail.env.local_archive_folder) {
                document.location.reload();
            }

            //Premier index de message_list = MA au lieu de 0
            if (uid == "MA") {
                uid = 0;
            }
            window.api.send('mail_select', uid)

            document.body.classList.add('busy-cursor');
            window.api.receive('mail_return', (mail) => {
                let body = $("#mainscreen").contents().find('#mailview-bottom');
                body.html(mail);
                document.body.classList.remove('busy-cursor');
            });
        });
    }
};

function openAttachment(uid, partid) {
    document.body.classList.add('busy-cursor');
    window.api.send('attachment_select', { 'uid': uid, 'partid': partid })

    window.api.receive('busy-loader', () => {
        document.body.classList.remove('busy-cursor');
    });
}

