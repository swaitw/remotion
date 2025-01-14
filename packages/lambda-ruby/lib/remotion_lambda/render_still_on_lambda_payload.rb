require_relative 'version'

def get_render_still_on_lambda_payload(
  bucket_name: nil,
  composition: nil,
  delete_after: nil,
  download_behavior: nil,
  env_variables: {},
  force_height: nil,
  force_path_style: false,
  force_width: nil,
  image_format: "jpeg",
  input_props: {},
  jpeg_quality: 80,
  log_level: "info",
  max_retries: 1,
  metadata: {},
  offthread_video_cache_size_in_bytes: nil,
  out_name: nil,
  overwrite: false,
  privacy: "public",
  scale: 1,
  serve_url: "testbed-v6",
  timeout_in_milliseconds: 30000,
  chromium_options: {},
  frame: 0
)

payload = {
    composition: composition,
    chromiumOptions: chromium_options,
    deleteAfter: delete_after,
    downloadBehavior: download_behavior,
    envVariables: env_variables,
    forceHeight: force_height,
    forcePathStyle: force_path_style,
    forceWidth: force_width,
    imageFormat: image_format,
    inputProps: {
      type: "payload",
      payload: JSON.generate(input_props)
    },
    jpegQuality: jpeg_quality,
    logLevel: log_level,
    maxRetries: max_retries,
    offthreadVideoCacheSizeInBytes: offthread_video_cache_size_in_bytes,
    outName: out_name,
    privacy: privacy,
    scale: scale,
    serveUrl: serve_url,
    timeoutInMilliseconds: timeout_in_milliseconds,
    type: "still",
    version: VERSION,
    bucketName: bucket_name,
    attempt: 1,
    streamed: false,
    frame: frame,
  }
  payload
end
