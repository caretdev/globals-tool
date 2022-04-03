globals-tool
====

Advanced Globals Viewer for InterSystems IRIS

List of namespaces and databases available in the system
![namespaces](https://raw.githubusercontent.com/caretdev/globals-tool/main/images/namespaces.png)

Easy access to getting size of the global
![namespaces](https://raw.githubusercontent.com/caretdev/globals-tool/main/images/globaltop.png)

Search  global name
![namespaces](https://raw.githubusercontent.com/caretdev/globals-tool/main/images/search.png)

Data for the global with endless scroll, and search by globals. Easy filtering, by clicking on subscripts deep and back by global name.
![namespaces](https://raw.githubusercontent.com/caretdev/globals-tool/main/images/global.png)

Installation
----

```shell
docker-compose up -d --build
```

Usage
----

Get the port from docker-compose output
```shell
docker-compose ps

NAME                  COMMAND                  SERVICE             STATUS              PORTS
globals-tool-iris-1   "/tini -- /iris-main…"   iris                running (healthy)   0.0.0.0:49653->1972/tcp, 0.0.0.0:49654->52773/tcp
```

Open by link http://localhost:49654/globals/index.html
