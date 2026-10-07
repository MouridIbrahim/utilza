// Allowlisted analytics values. Source: spec §16/§45.
// Never send PII. Platform is android|ios from the app.
abstract final class AnalyticsEvents {
  static const toolOpened = 'tool_opened';
  static const toolCompleted = 'tool_completed';
  static const toolFailed = 'tool_failed';
  static const fileUploaded = 'file_uploaded';
  static const resultDownloaded = 'result_downloaded';
  static const resultCopied = 'result_copied';
  static const toolFavorited = 'tool_favorited';
  static const searchPerformed = 'search_performed';

  static const values = <String>{
    toolOpened,
    toolCompleted,
    toolFailed,
    fileUploaded,
    resultDownloaded,
    resultCopied,
    toolFavorited,
    searchPerformed,
  };
}

abstract final class AnalyticsPlatforms {
  static const android = 'android';
  static const ios = 'ios';
  static const web = 'web';
  static const unknown = 'unknown';
}
