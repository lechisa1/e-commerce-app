export class CategoryHelper {
  static flattenTree(categories: any[], result: any[] = []): any[] {
    for (const category of categories) {
      result.push({
        id: category.id,
        name: category.name,
        slug: category.slug,
        level: category.level,
      });
      if (category.children && category.children.length) {
        this.flattenTree(category.children, result);
      }
    }
    return result;
  }

  static findCategoryById(categories: any[], id: string): any {
    for (const category of categories) {
      if (category.id === id) {
        return category;
      }
      if (category.children && category.children.length) {
        const found = this.findCategoryById(category.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  static getCategoryIds(categories: any[], ids: string[] = []): string[] {
    for (const category of categories) {
      ids.push(category.id);
      if (category.children && category.children.length) {
        this.getCategoryIds(category.children, ids);
      }
    }
    return ids;
  }
}
