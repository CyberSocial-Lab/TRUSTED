# TrustED Consent Management — Avvio locale

Guida per avviare il Consent Manager con Docker Compose e l'Hospital Simulator sul PC, con backend Node.js e frontend Vite.

## Architettura

| Componente | Esecuzione | Indirizzo dal PC |
|---|---|---|
| Consent Manager | Docker | http://localhost:3000 |
| PostgreSQL | Docker | localhost, porta pubblicata nel Compose |
| RabbitMQ | Docker | localhost:5672 |
| Pannello RabbitMQ | Docker | http://localhost:15672 |
| Backend Hospital Simulator | Node.js sul PC | http://localhost:4001 |
| Frontend Hospital Simulator | Vite sul PC | URL mostrato da `npm run dev` |

Questa procedura assume Docker Desktop e che gli script del simulatore siano `start` per il backend e `dev` per il frontend. Esegui ogni comando nella cartella che contiene il relativo `package.json`.

## Prerequisiti

- Docker Desktop avviato, con Docker Compose disponibile.
- Node.js e npm compatibili con i progetti. Il backend del simulatore utilizza `fetch` nativo.
- Progetti Consent Manager e Hospital Simulator disponibili sul PC.
- File `.env` del Consent Manager configurato con le credenziali PostgreSQL e RabbitMQ.
- Database inizializzato con le migration e i dati di test richiesti: chiavi pubbliche, ricercatore e ospedali.

Questa guida descrive l'avvio di un ambiente già inizializzato; `docker compose up` non implica che migration e seed vengano eseguiti automaticamente.

## 1. Avviare il Consent Manager

Apri un terminale nella cartella `consent-managment`, dove si trova il file Docker Compose:

```bash
docker compose up
```

Al primo avvio, oppure dopo modifiche al codice del backend, usa:

```bash
docker compose up --build
```

Per avviare in background:

```bash
docker compose up -d --build
```

Il Compose avvia backend, PostgreSQL e RabbitMQ. Il backend è raggiungibile su **http://localhost:3000**.

Se un'altra istanza del Consent Manager è già avviata sul PC, fermala prima per liberare la porta 3000.

All'interno del container, il backend deve usare i nomi dei servizi:

- PostgreSQL: `postgres:5432`.
- RabbitMQ: `rabbitmq:5672`.

Le credenziali nell'URL RabbitMQ del backend devono corrispondere a quelle configurate per il broker.

## 2. Avviare il backend dell'Hospital Simulator

Apri un secondo terminale nella cartella del backend del simulatore.

La prima volta installa le dipendenze:

```bash
npm install
```

Avvia il server:

```bash
npm run start
```

Lascia aperto il terminale. Per impostazione predefinita, il codice del simulatore usa:

- `PORT=4001`.
- `CONSENT_MANAGEMENT_URL=http://localhost:3000`.

Questo URL è corretto perché il simulatore gira sul PC e raggiunge il Consent Manager tramite la porta pubblicata da Docker. Se imposti variabili differenti, assicurati che vengano effettivamente caricate dal processo Node.

Verifica l'avvio aprendo:

**http://localhost:4001/health**

Risposta attesa:

```json
{
  "status": "ok",
  "service": "hospital-simulator"
}
```

## 3. Configurare gli URL dei webhook

Il Consent Manager gira in Docker, mentre il backend del simulatore gira sul PC. Gli URL registrati nella colonna `webhookUrl` della tabella `hospitals` devono quindi essere:

| Ospedale | URL webhook |
|---|---|
| 1 | http://host.docker.internal:4001/hospitals/1/webhooks/study-requests |
| 2 | http://host.docker.internal:4001/hospitals/2/webhooks/study-requests |
| 3 | http://host.docker.internal:4001/hospitals/3/webhooks/study-requests |

Dentro il container, `localhost` indica il container stesso. Con Docker Desktop, `host.docker.internal` permette di raggiungere il PC.

Per aggiornare gli URL di test già salvati, entra nel container PostgreSQL:

```bash
docker exec -it TRUSTED-DB sh
```

Apri PostgreSQL usando le variabili del container:

```sh
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Esegui:

```sql
UPDATE hospitals
SET "webhookUrl" = REPLACE(
    "webhookUrl",
    'http://localhost:4001/',
    'http://host.docker.internal:4001/'
),
"updatedAt" = NOW()
WHERE "webhookUrl" LIKE 'http://localhost:4001/hospitals/%'
RETURNING id, "webhookUrl";
```

Controlla tutti gli indirizzi:

```sql
SELECT id, "organizationId", "webhookUrl"
FROM hospitals
ORDER BY id;
```

Esci da PostgreSQL con `\q` e dalla shell del container con `exit`.

Se prepari un nuovo database con un seeder, configura anche gli URL del seeder per questa modalità di esecuzione. Modificare il seeder non aggiorna le righe già presenti: non rieseguirlo soltanto per cambiare gli URL.

## 4. Avviare il frontend dell'Hospital Simulator

Apri un terzo terminale nella cartella del frontend del simulatore.

La prima volta installa le dipendenze:

```bash
npm install
```

Avvia Vite:

```bash
npm run dev
```

Apri l'URL mostrato nel terminale.

Il frontend deve raggiungere il backend del simulatore su **http://localhost:4001**, direttamente o attraverso il proxy Vite configurato nel progetto. L'indirizzo `host.docker.internal` serve alle chiamate dal Consent Manager in Docker, non alle normali chiamate del browser sul PC.

Per questa modalità di sviluppo non serve eseguire prima la build Vite. La build del frontend non avvia il backend Node del simulatore.

## 5. Verificare il flusso completo

1. Lascia accesi tutti i componenti.
2. Invia una nuova richiesta di studio al Consent Manager usando l'endpoint configurato in Postman.
3. Nel body usa `researcher_id` con l'ID di un ricercatore attivo, un `request_id` univoco e una scadenza futura.
4. Verifica che `webhookNotifications.errors` sia vuoto e che `delivered` corrisponda al numero di ospedali destinatari.
5. Nel terminale del simulatore cerca il messaggio `[Hospital 1] Webhook received`, o quello dell'ospedale interessato.
6. Apri **http://localhost:4001/hospitals/1/api/study-requests** per verificare la presenza della richiesta.
7. Apri il frontend, seleziona l'ospedale destinatario e aggiorna la pagina se necessario.

Per una richiesta destinata a due ospedali, il risultato atteso per i webhook è:

```json
{
  "webhookNotifications": {
    "delivered": 2,
    "errors": []
  }
}
```

Le notifiche RabbitMQ e quelle webhook sono separate: il successo delle prime non garantisce il successo delle seconde.

**Il simulatore conserva le richieste in memoria.** Riavviandone il backend, le richieste ricevute vengono perse. Per verificarne la visualizzazione, invia una nuova richiesta dopo il riavvio.

## Comandi utili

Stato dei container:

```bash
docker compose ps
```

Log del Consent Manager:

```bash
docker compose logs -f backend
```

Ricostruzione del solo backend dopo modifiche:

```bash
docker compose up -d --build backend
```

Arresto dei servizi Docker senza rimuovere i container:

```bash
docker compose stop
```

Per fermare backend e frontend del simulatore, premi `Ctrl+C` nei rispettivi terminali.

I volumi PostgreSQL e RabbitMQ conservano i dati; evita `docker compose down -v` se vuoi mantenerli.

## Risoluzione dei problemi

| Problema | Controllo |
|---|---|
| Webhook: `fetch failed` | Verifica che il simulatore sia acceso e che gli URL nel database usino `host.docker.internal:4001`. |
| `/health` risponde, ma il webhook fallisce | La risposta dal browser verifica PC → simulatore. Controlla anche il percorso Docker → PC e le regole del firewall. |
| API del simulatore restituisce `[]` | Verifica ospedale destinatario, consegna del webhook ed eventuale riavvio del simulatore. |
| API contiene dati, frontend vuoto | Verifica l'ospedale selezionato e l'URL delle richieste nella scheda Network del browser. |
| Porta 3000 già occupata | Ferma il Consent Manager locale prima di avviare quello Docker. |
| Docker esegue codice precedente | Ricostruisci con `docker compose up -d --build backend`. |
| `researcherId is required` | Il body deve contenere `researcher_id`; il controller lo passa al servizio come `researcherId`. |
| Errori sui modelli Data Portal / Researcher | Mantieni coerenti modello `Researcher`, tabella `researchers` e associazioni `researcherId`. |

## Alternativa: Consent Manager sul PC

Per eseguire anche il Consent Manager localmente, ferma il backend Docker e lascia accesi i servizi di supporto:

```bash
docker compose stop backend
docker compose up -d postgres rabbitmq
```

Configura il backend locale con PostgreSQL su `localhost` e la porta pubblicata nel Compose, RabbitMQ su `localhost:5672` e i webhook su `http://localhost:4001/...`.

Non avviare contemporaneamente il backend locale e quello Docker sulla stessa porta 3000.

