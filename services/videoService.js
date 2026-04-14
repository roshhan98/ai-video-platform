import ffmpeg from "../utils/ffmpeg.js";

export const createVideo = (images, audio, output) => {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    images.forEach((img) => {
      command.input(img).inputOptions(["-loop 1", "-t 3"]);
    });

    command
      .input(audio)
      .outputOptions([
        "-c:v libx264",
        "-r 30",
        "-pix_fmt yuv420p",
        "-c:a aac",
        "-shortest"
      ])
      .save(output)
      .on("end", () => resolve(output))
      .on("error", reject);
  });
};