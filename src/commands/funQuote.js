module.exports = {
    data: {
        name: 'witz',
        description: 'Zufallswitz',
    },

    run: async ({ interaction, client, handler }) => {
        const categories = [
          'programmierwitze',
          'flachwitze',
          'chuck-norris-witze',
        ]
        const category = categories[Math.floor(Math.random() * categories.length)];
        const request = `https://witzapi.de/api/joke/?limit=1&category=${category}&language=de`;
        let data = await fetch(request).then(response => response.json());
        console.log(data);
        interaction.reply({ content: data[0].text, ephemeral: true });
    },
    options: {
        devOnly: true,
        deleted: false,
    },
};