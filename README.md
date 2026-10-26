# Accès SSH à la VM Ubuntu depuis la machine physique

## 1. Environnement

| Élément | Valeur |
|---|---|
| Machine physique | Windows *(à compléter : version, ex. Windows 11)* |
| Hyperviseur | Oracle VirtualBox |
| VM | Ubuntu 26.04 LTS (noyau 7.0.0-34-generic) |
| Utilisateur de la VM | `ferid` |
| Nom d'hôte | `Ubuntu-26` |
| Adresse IP de la VM | `192.168.100.88` (adaptateur 1, accès par pont) |

## 2. Configuration côté VM

Installation du serveur SSH :

```bash
sudo apt update
sudo apt install openssh-server
```

Vérification que le service tourne :

```bash
systemctl status ssh
```

Le service doit afficher `active (running)`.

Relevé de l'adresse IP :

```bash
ip a
```

Les clés du serveur (host keys) sont générées automatiquement à l'installation
dans `/etc/ssh/` (fichiers `ssh_host_*_key` et `ssh_host_*_key.pub`).

## 3. Réseau VirtualBox

Dans *Configuration → Réseau* de la VM, l'adaptateur 1 est en
**accès par pont** afin que la VM soit joignable depuis Windows.
L'adresse `10.0.3.15` (NAT) n'est pas joignable directement depuis la machine physique.

## 4. Test de connexion depuis la machine physique

Commande exécutée dans PowerShell sous Windows :

```powershell
ssh ferid@192.168.100.88
```

À la première connexion, l'empreinte du serveur est affichée et acceptée (`yes`).
Elle est enregistrée dans `C:\Users\<nom>\.ssh\known_hosts`.
Le mot de passe de `ferid` est ensuite demandé.

Commandes de vérification une fois connecté :

```bash
hostname
whoami
ip a
```

### Capture d'écran

![Connexion SSH réussie depuis Windows](images/ssh_test.png)

*La capture montre PowerShell sous Windows, la commande `ssh`, puis le prompt
`ferid@Ubuntu-26:~$` qui confirme la connexion à la VM.*

## 5. Authentification par clé (optionnel)

Génération de la paire de clés sous Windows :

```powershell
ssh-keygen -t ed25519
```

Copie de la clé publique vers la VM :

```powershell
scp $env:USERPROFILE\.ssh\id_ed25519.pub ferid@192.168.100.88:/tmp/key.pub
```

Ajout de la clé dans la VM :

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
cat /tmp/key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
rm /tmp/key.pub
```

### Emplacement des clés

| Clé | Machine | Emplacement | Rôle |
|---|---|---|---|
| Clé privée utilisateur | Windows | `C:\Users\<nom>\.ssh\id_ed25519` | Signe le défi (reste secrète) |
| Clé publique utilisateur | VM | `/home/ferid/.ssh/authorized_keys` | Vérifie l'identité de l'utilisateur |
| Clé privée du serveur | VM | `/etc/ssh/ssh_host_ed25519_key` | Prouve l'identité de la VM |
| Clé publique du serveur | Windows (empreinte) | `C:\Users\<nom>\.ssh\known_hosts` | Vérifie que l'on parle à la bonne VM |

## 6. Problèmes rencontrés

- *(à compléter selon votre expérience, par exemple : timeout de connexion résolu
  en passant l'adaptateur réseau en accès par pont)*
- Installation des Additions invité VirtualBox : le module `vboxvideo` ne compile pas
  avec le noyau 7.0 (erreur `DRM_ERROR`), sans impact sur SSH.

## 7. Installation de Docker sur la VM

Méthode officielle : dépôt APT de Docker (Ubuntu 26.04 « resolute » est supporté).
Les commandes sont exécutées dans la VM (directement ou via SSH).

### 7.1 Supprimer les paquets susceptibles d'entrer en conflit

```bash
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
  sudo apt remove -y $pkg
done
```

### 7.2 Ajouter le dépôt officiel Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
```

### 7.3 Installer Docker Engine

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 7.4 Vérifier l'installation

```bash
sudo systemctl status docker     # doit afficher "active (running)"
docker --version
sudo docker run hello-world
```

### 7.5 Utiliser Docker sans `sudo` (optionnel)

```bash
sudo usermod -aG docker $USER
newgrp docker
docker run hello-world
```

### Capture d'écran

![Docker installé et test hello-world](images/docker_test.png)

*La capture montre le résultat de `docker --version` et du conteneur `hello-world`
(message « Hello from Docker! »).*

## 8. Sécurité

- La clé privée (`id_ed25519`) ne doit jamais être partagée ni publiée.
- Aucun mot de passe ni phrase secrète n'est inclus dans ce document.
