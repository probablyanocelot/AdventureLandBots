function buyScrolls() {
  // if (!is_in_range('lucas')) return
  let scroll0_idx = locate_item("scroll0");
  let scroll1_idx = locate_item("scroll1");
  let cscroll0_idx = locate_item("cscroll0");
  let cscroll1_idx = locate_item("cscroll1");

  if (scroll0_idx == -1) buy_with_gold("scroll0", 10);
  if (scroll1_idx == -1) buy_with_gold("scroll1", 10);
  if (cscroll0_idx == -1) buy_with_gold("cscroll0", 10);
  if (cscroll1_idx == -1) buy_with_gold("cscroll1", 10);
}
