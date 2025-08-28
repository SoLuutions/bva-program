// api/ping.js — sanity check for runtime + envs
module.exports = (req, res) => {
    res.status(200).json({
      ok: true,
      env: {
        MAILCHIMP_API_KEY: !!process.env.MAILCHIMP_API_KEY,
        MAILCHIMP_AUDIENCE_ID: !!process.env.MAILCHIMP_AUDIENCE_ID,
      },
      node: process.version,
      now: new Date().toISOString(),
    });
  };
  