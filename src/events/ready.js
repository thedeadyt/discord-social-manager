export default {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Bot ready: ${client.user.tag}`);
  },
};
