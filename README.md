# natan

Загрузчик конфигураций, умеет:
 * Загружать файлы с расширениями: `json`, `js`
 * Накладывать конфигурационные файлы, в соответствии с заданной иерархией
 * Интерполировать значения, для мелкой автоматизации

```
npm i natan --save
```

### Overlapping 

В контексте наложения используются следующие типы файлов:
 * Узловой файл:
   * Непосредственно загружаемый из приложения или наследуемый файл
   * Может иметь зависимости: 
     * Наследуемый файл
     * Дефолтный файл
     * Локальный файл 
 * Дефолтный файл:
   * Узловой файл перекрывает дефолтный файл
   * Не имеет зависимостей
 * Локальный файл:
   * Локальный файл перекрывает узловой файл
   * Не имеет зависимостей 

Для определения иерархии наложения можно использовать:
 * Соглашение:
   * Наследуемый файл:
     * Расположен на одну директорию ниже узлового файла
     * Имеет тоже имя, что и узловой, но может иметь другое расширение
   * Дефолный файл:
     * Расположен в той же директории, что и узловой 
     * Имеет имя `default`, и одно из разрешенных расширений
   * Локальный файл:
     * Расположен в той же директории, что и узловой
     * Имеет имя узлового, с добавлением постфикса `.local` и разрешенное расширение файла
  * Конфигурацию:
    * Наследуемый файл: добавлением поля `__parent__` в узловой файл
    * Дефолтный файл: добавлением поля `__default__` в узловой файл
    * Локальный файл: добавлением поля `__local__` в узловой файл 

![example-config](/accompanying-files/example-config.png)

```js
var natan = require('natan')
var config = natan('node_modules/example-config/dashboard/dev') 
console.info(config)

/*
{ onTopTest: 'dashboard/dev!',
  logger: { transports: { Console: { level: 'debug', debugStdout: true, colorize: true } } },
  ports: { server: 7070, dashboard: 9090 },
  serverAddress: 'http://localhost:7070',
  someRegExp: /^(\d+)$/,
  storage: '/tmp/' }
*/

```

В данной примере:
 * Загружается узловой файл: dashboard/dev.json
 * Загружается дефолный файл узлового: dashboard/default.json
 * Загружается наследуемый файл узлового: dev.json
 * Загружается дефолтный файл наследуемого: default.json
 * Файлы накладываются в соответствие со своей иерархией
 * Значения интерполируются

Наложение может быть отключено:
 * Заданием переменной окружения: `NATAN_OVERLAPPING=false`
 * Передачей вторым аргументом: `natan(path, { useInterpolating: false })`

### Interpolating

Интерполяция была задумана как мелкая автоматизация, для случаев когда:
 * Значения зависят от других значения 
 * Значения являются вычисляемыми 

Например удобно используя микросервисную архитектуру, определить порты приложений в общем файле, а в конфигурационном файле сервиса вычислить адреса на основе портов.

```js
// root.json
{
    "ports": { "server": 100000, "dashboard": 8080 } }
}

// server.json
{
    "__parent__": "root",
    "dashboardAddress": "http://localhost:k{ ports.dashboard }"
}
```

Или задать временной интервал в человеко читаемом формате:
```js
{
    "updateInterval": "t{ one minute }"
}
```

Или вычислить абсолютный путь к хранилищу, относительно рабочей директории:
```js
{
    "storage": "p{ ./storage }"
}
```

Или сделать что-нибудь безумное:
```js
{
    "workerName": "f{ 'worker-' + require('os').hostname() + '-' + Date.now() }" 
}
```

Полный список интерполируемых значений:
 * `k{ ... }` - определяет значение по существующему ключу
 * `t{ ... }` - определяет временной интервал в миллисукундах, используется библиотека [human-interval](https://github.com/rschmukler/human-interval)   
 * `p{ ... }` - определяет абсолютный путь, относительно рабочий директории
 * `r{ ... }` - вычисляет регулярное выражение, аналог вызова `new RegExp('...')`
 * `f{ ... }` - вычисляет значение функции, функции интерполируются в последнюю очередь, в качестве `this` используется текущая вычисленная конфигурация.

Интерполяция может быть отключена:
 * Заданием переменной окружения: `NATAN_INTERPOLATING=false`
 * Передачей вторым аргументом: `natan(path, { useInterpolating: false })`

### Debug

* Можно запустить тесты `cd node_modules/natan && npm run test`
* Можно увидеть этапы сборки конфигурации задав: `DEBUG=natan`
* Можно воспользоваться отладочными утилитами: `natan-test-config` и `natan-test-configs`

```
PATH="$PATH:$PWD/node_modules/.bin"
natan-test-config -c node_modules/natan/example-config/dashboard/dev
```

![natan-test-config](/accompanying-files/natan-test-config.png)

```
PATH="$PATH:$PWD/node_modules/.bin"
natan-test-configs -d node_modules/natan/example-config/
```

![natan-test-configs](/accompanying-files/natan-test-configs.png)
