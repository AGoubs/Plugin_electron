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

if (window.rcmail) {
    rcmail.addEventListener('responseafterlist', function (evt) {
        if (rcmail.env.task == 'mail' && rcmail.env.mailbox == 'Archives locale') {
            loadArchive('');
            displaySubfolder();
        }
    });
}

function displaySubfolder() {
    window.api.send('subfolder');
    window.api.receive('listSubfolder', (subfolders) => {
        if (!subfolders) {
            loadArchive('');
        }
        else {
            subfolders.forEach(subfolder => {
                subfolder.relativePath = subfolder.relativePath.replace(/\\/g, "/");
                let key = subfolder.relativePath;
                let link = $('<a>').attr('href', '#')
                    .attr('rel', subfolder.name)
                    .attr('onClick', "loadArchive('" + key + "')")
                    .html(subfolder.name);
                rcmail.treelist.insert({ id: 'Archives locale/' + key, html: link, classes: ['mailbox'] }, 'Archives locale', 'mailbox');
                getChildren(subfolder);
            })
        }
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
                .attr('onClick', "loadArchive('" + key + "')")
                .html(child.name);
            rcmail.treelist.insert({ id: 'Archives locale/' + key, html: link, classes: ['mailbox'] }, 'Archives locale/' + parent.relativePath, 'mailbox');
            getChildren(child);
        }
    }
}

function loadArchive(path) {
    window.api.send('read_mail_dir', path)
    document.body.classList.add('busy-cursor');

    window.api.receive('mail_dir', (mails) => {
        mails.forEach((mail) => {
            if (mail.break == 0) {
                mail.date = new Date(mail.date).toLocaleString('fr-FR', { timeZone: 'UTC' });
                let flags = { "seen": 1, "ctype": mail.content_type, "mbox": "Archives locale" };
                rcmail.add_message_row(mail.id, mail, flags, false);
            }
        });
        rcmail.set_rowcount(rcmail.message_list.rowcount, "Archives locale")
        document.body.classList.remove('busy-cursor');
    })
    if (rcmail.message_list) {
        rcmail.message_list.clear();
        delete rcmail.message_list._events;

        rcmail.message_list.addEventListener('select', function (list) {
            let uid = list.get_single_selection();

            if (uid == null && rcmail.env.mailbox != 'Archives locale') {
                document.location.reload();
            }

            if (rcmail.env.task == 'mail' && rcmail.env.mailbox == 'Archives locale') {

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
            }
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