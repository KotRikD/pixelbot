# Pixelbot

### Получаем ссылку на веб-сокеты

1. Лезем в консоль браузера на вкладку Network и обновляем страницу
2. В поиск|filter пишем ws и ищем строку где Статус|Status = 101
3. Пкм->Скопировать ссылку

### Быстрый старт

0. Устанавливаем Node.JS! Ссылка на скачивание: https://nodejs.org/en/
1. Распаковываем архив (kotrik.ru/PixelBattle-2019.zip)
2. Открываем config.json и добавляем ссылку полученную из гайда выше(можно несколько аккаунтов)

```json
{
    "wssLinks": [
        "wss://pixel2019.vkforms.ru/ws/..."
    ]
}
```

3. Сохраняем и запускаем `start.bat` или `start_linux_mac.sh`(для linux/mac)

Поздравляю теперь вы помогаете нам!

## У меня есть докер

Создаем `config.json` и добавляем ссылку

```json
{
    "wssLinks": [
        "wss://pixel2019.vkforms.ru/ws/..."
    ]
}
```

Собираем и запускаем

```sh
docker build -t pixelbot .
docker run --rm -it -v $PWD/config.json:/app/config.json pixelbot
```

TODO: сделать готовое изображение