// etude.js — bouton « Partager » des études de cas.
// Sur téléphone, la feuille de partage du système ; ailleurs, le lien est
// copié et le bouton le dit. Sans JavaScript, le bouton reste caché.
(function () {
    'use strict';
    // Bascule entre deux versions d'une meme figure : sans JavaScript, les
    // deux restent affichees l'une sous l'autre.
    document.querySelectorAll('.e-versions').forEach(function (bloc) {
        var seg = bloc.querySelector('.e-seg');
        var boutons = seg.querySelectorAll('button');
        function montrer(id) {
            boutons.forEach(function (b) {
                var actif = b.getAttribute('data-version') === id;
                b.setAttribute('aria-pressed', actif ? 'true' : 'false');
                document.getElementById(b.getAttribute('data-version')).hidden = !actif;
            });
        }
        seg.hidden = false;
        boutons.forEach(function (b) {
            b.addEventListener('click', function () { montrer(b.getAttribute('data-version')); });
        });
        montrer(boutons[0].getAttribute('data-version'));
    });

    document.querySelectorAll('.e-partage').forEach(function (b) {
        b.hidden = false;
        var lib = b.querySelector('.e-partage-lib');
        var initial = lib.textContent;
        b.addEventListener('click', function () {
            var url = location.href.split('#')[0];
            var titre = document.title;
            if (navigator.share && matchMedia('(pointer: coarse)').matches) {
                navigator.share({ title: titre, url: url }).catch(function () {});
                return;
            }
            var fait = function () {
                lib.textContent = b.getAttribute('data-copie');
                b.setAttribute('data-etat', 'copie');
                setTimeout(function () { lib.textContent = initial; b.removeAttribute('data-etat'); }, 2400);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(fait, function () { prompt(b.getAttribute('data-copier'), url); });
            } else {
                prompt(b.getAttribute('data-copier'), url);
            }
        });
    });
})();
