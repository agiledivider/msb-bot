# msb-bot

Das wird ein Discord Bot für den Makerspace Bonn.

Offene Ideen:
- An den Müll erinnern
- An Veranstaltungen aus dem Kalender einen Tag vorher erinnern.
- Suche nach items im Space
- Wer kann was im space?

Build the Docker Image
```bash
# wenn man auf nem arm gerät für amd bauen will :)
docker build . -t msb-bot --platform="linux/amd64"
```

Tag the Docker Image
```bash
docker tag msb-bot falkkuehnel/msb-bot:latest
```

Upload the Docker Image to Docker Hub
```bash
docker push falkkuehnel/msb-bot:latest 
```


Wenn man nicht die Standard DB bei Postgrest mit drizzle nutzt, dann braucht man folgendes:
```postgresql
ALTER DATABASE my_database OWNER TO my_database_user;
```

