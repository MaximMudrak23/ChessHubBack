export function verificationEmailTemplate(verifyLink: string) {
    return `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#101820;font-family:Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;padding:32px;">
                <div style="background:#182533;border-radius:16px;padding:32px;color:#ffffff;">
                    <h1 style="margin:0 0 16px;font-size:28px;">Confirm your ChessHub email</h1>

                    <p style="font-size:16px;line-height:1.5;color:#c9d6e2;">
                        Click the button below to finish creating your account.
                    </p>

                    <a
                        href="${verifyLink}"
                        style="
                            display:inline-block;
                            margin-top:20px;
                            padding:14px 24px;
                            background:#9FD05E;
                            color:#101820;
                            text-decoration:none;
                            border-radius:10px;
                            font-weight:bold;
                        "
                    >
                        Confirm Email
                    </a>

                    <p style="margin-top:24px;font-size:13px;color:#7f8b96;">
                        This link expires in 30 minutes.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
}