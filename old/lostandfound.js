// shamelessly borrowed from aria for future use after i git gud
function buyFromGoblin2() {
    use_skill("town")
    smart_move("woffice", () => {
        let lost_and_found = JSON.parse(localStorage.getItem("lostandfound_" + parent.server_region + " " + parent.server_identifier));
        let updated = false;
        parent.socket._callbacks.$lostandfound.unshift(function (data) {
            if (parent) {
                lost_and_found = data;
                lost_and_found.sort((a, b) => {
                    return parent.calculate_item_value(b) * (b.q || 1) - parent.calculate_item_value(a) * (a.q || 1)
                });
                lost_and_found.reverse();
                parent.lostandfound = lost_and_found;
                let purchases = 0;
                for (var i = 0; i < lost_and_found.length; i++) {
                    let item = lost_and_found[i];
                    if (["goldenegg", "essenceoffire", "cryptkey"].includes(item.name)) {
                        parent.socket.emit("sbuy", { rid: item.rid, f: true });
                        purchases++;
                        break;
                    }
                }
                localStorage["lostandfound_" + parent.server_region + " " + parent.server_identifier] = JSON.stringify(data);
                if (purchases == 0 && !updated) {
                    let least = lost_and_found[0];
                    parent.socket.emit("sbuy", { rid: least.rid, f: true });
                    updated = true;
                }

                lost_and_found.reverse();
            }
        });
        if (lost_and_found == null) {
            parent.donate(1000000);
            parent.socket.emit("lostandfound");
        } else {
            parent.socket._callbacks.$lostandfound.forEach((callback) => {
                callback(lost_and_found);
            });
        }

    })
}