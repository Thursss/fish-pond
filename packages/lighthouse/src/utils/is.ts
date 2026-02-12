/**
 * 判断节点是否为指定类型的DOM元素
 * 支持跨iframe环境的类型检查，确保在不同文档上下文中的正确性
 *
 * @param node - 待检查的节点对象
 * @param nodeType - DOM元素类型名称（如'HTMLElement', 'SVGElement', 'Element'等）
 * @returns 如果节点是指定类型的DOM元素则返回true，否则返回false
 */
export function isElement(node: any, nodeType: string) {
  // 空值检查：确保节点对象存在
  if (!node)
    return false

  // 获取节点所属的文档窗口对象，支持跨iframe环境
  const win = node.ownerDocument?.defaultView

  // 检查窗口对象是否存在，并使用instanceof进行类型判断
  // 这种方式可以正确处理跨文档上下文的元素类型检查
  return !!win && node instanceof win[nodeType]
}

export function isExist(value: any) {
  return value !== undefined && value !== null
}
