export namespace Utils {
  export // 驼峰转换下划线
  function toLine(str: string) {
    return str.replace(/([A-Z])/g, "_$1").toLowerCase();
  }
  /**
   * 驼峰
   * @param str
   */
  export function toHump(str: string): string {
    return str.replace(/\_(\w)/g, function ($0, $1) {
      return $1.toUpperCase();
    });
  }
  /**
   * 首字母大写
   * @param str
   */
  export function toFirstUpperCase(str: string): string {
    return str.slice(0, 1)?.toUpperCase() + str.slice(1) ?? "";
  }
  /**
   * 首字母小写
   * @param str
   */
  export function toFirstLowercase(str: string): string {
    return str.slice(0, 1)?.toLowerCase() + str.slice(1) ?? "";
  }

  /**
   * 大写驼峰
   * @param str
   */
  export function toUpperCaseHump(str: string): string {
    return toFirstUpperCase(toHump(str));
  }
  /**
   * 小写驼峰
   * @param str
   */
  export function toLowercaseHump(str: string): string {
    return toFirstLowercase(toHump(str));
  }
}
