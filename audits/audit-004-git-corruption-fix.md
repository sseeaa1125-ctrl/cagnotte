# Audit 004 — Git corrompu : diagnostic et résolution

**Date** : 22 mars 2026  
**Sévérité** : Critique  
**Statut** : ✅ Résolu

---

## Symptômes

- `git commit` bloque indéfiniment (hang)
- `git push` dit "Everything up-to-date" alors qu'il y a des changements
- `git pull` fonctionne normalement

## Problèmes identifiés

### 1. Fichier `~/.gitconfig` manquant
- **Impact** : `git commit` ne peut pas identifier l'auteur → hang silencieux
- **Erreur** : `fatal: unable to read config file '/Users/amadoufall/.gitconfig': No such file or directory`
- **Fix** : Recréation du `.gitconfig` avec `user.name=faratasn-pixel` et `user.email=faratasn@gmail.com`

### 2. Branche `main` sans tracking
- **Impact** : `git push` / `git pull` sans arguments ne savent pas où pousser/tirer
- **Config manquante** : `branch.main.remote` et `branch.main.merge`
- **Fix** : `git branch --set-upstream-to=origin/main main`

### 3. Processus git zombies
- **Impact** : Multiples `git commit` bloqués créant des `index.lock` en boucle
- **Détail** : 3 processus git commit actifs simultanément, chacun attendant le lock de l'autre
- **Fix** : `kill -9` sur tous les processus + suppression de `.git/index.lock`

### 4. Index git corrompu (ROOT CAUSE)
- **Impact** : Même après fix des problèmes 1-3, `git commit` hang toujours
- **Erreur** : `fatal: mmap failed: Operation canceled` (révélé par `git fsck`)
- **Cause** : Attributs étendus macOS `com.apple.provenance` sur les fichiers `.git/objects/`
- Les fichiers pack (read-only `-r--r--r--@`) avaient des xattrs que `xattr -cr` ne pouvait pas supprimer sans chmod
- **Fix** : Re-clone complet du repo + restauration des fichiers modifiés via rsync

## Résolution appliquée

1. Backup des fichiers de travail dans `/tmp/fari-backup/` (rsync, excluant .git/node_modules/.next)
2. Rename du repo corrompu en `fari.store.broken`
3. `git clone` frais depuis GitHub
4. Restauration des fichiers modifiés via rsync
5. `git add -A && git commit` → succès
6. `git push origin main` → succès (`cc648e7e..763e941d`)
7. Nettoyage du backup et du repo corrompu

## Prévention

- **Ne jamais déplacer/copier un repo git** entre machines via AirDrop/clé USB (macOS ajoute `com.apple.provenance`)
- Si git hang → vérifier `ps aux | grep git` pour les zombies
- Si `mmap failed` → le `.git/` est corrompu, re-cloner est le fix le plus fiable
- Toujours vérifier que `~/.gitconfig` existe après un changement de machine/profil
