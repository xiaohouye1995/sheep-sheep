import { _decorator, Component, Node, instantiate, v3, Sprite, math, Label, Tween, tween, UITransform, Button } from "cc";
const { ccclass, property } = _decorator;
/**关卡配置 */
let TABLE = {
    level1: {
        map: [
            [1000, 1005, 1010, 300, 305, 310],
            [900, 905, 910, 200, 205, 210],
        ],
    },
    level2: {
        map: [
            [604, 606, 404, 406],
            [703, 705, 707, 503, 507, 303, 305, 307],
            [802, 804, 806, 808, 602, 608, 402, 408, 202, 204, 206, 208],
            [901, 903, 905, 907, 909, 701, 703, 705, 707, 709, 501, 503, 507, 509, 301, 303, 305, 307, 309, 101, 103, 105, 107, 109],
            [1000, 1002, 1004, 1006, 1008, 1010, 800, 802, 804, 806, 808, 810, 600, 602, 608, 610, 400, 402, 408, 410, 200, 202, 204, 206, 208, 210, 0, 2, 4, 6, 8, 10],
            [901, 903, 905, 907, 909, 701, 709, 501, 509, 301, 309, 0, 2, 4, 6, 8, 10],
        ],
    },
};
interface IMapItem {
    /**索引 */
    layerIdx?: number;
    /** 索引2*/
    pos?: number;
    /**item */
    item?: Node;
    /**是否解锁 */
    lockNum?: number;
    /**待解锁列表 */
    lockList?: Array<{ upPos: number | string; upPosK: number | string }>;
    /**是否可以消除的索引*/
    shape?: number;
}
interface IDealItem {
    /**是否可以消除的索引 */
    shape?: number;
    /**x */
    x?: number;
    /**y */
    y?: number;
    /**未解锁列表 */
    item?: Node;
    /**是否移动过 */
    isMove: boolean;
}
type k_v<T> = {
    [key: string]: T;
};
@ccclass("game")
export class game extends Component {
    @property(Node)
    yangItem: Node = null;
    @property(Node)
    layerYang: Node = null;
    @property(Node)
    onClickRefresh: Node = null;
    @property(Node)
    layerDeal: Node = null;
    @property(Node)
    layerGameOver: Node = null;
    @property(Node)
    playBtn: Node = null;
    @property(Node)
    mask: Node = null;
    dealMaxNum = 7; //底部消除最多
    dealList: IDealItem[] = [];
    map: k_v<IMapItem> = {}; //存放item
    mapMaxIndex = 0;
    /**是否在刷新 */
    isRefreshAni = false;
    /**是否在消除 */
    isEliminateAni = false;
    /**是否结束 */
    isGameOver = false;
    level = 1;
    onLoad() {
        this.startGame();
        this.bindBtn();
    }
    bindBtn() {
        this.onClickRefresh.on(Button.EventType.CLICK, () => {
            if (this.isGameOver) return;
            if (this.isRefreshAni) return;
            this.isRefreshAni = true;
            let orderList = [];
            for (let layerIdx in this.map) {
                if (Object.prototype.hasOwnProperty.call(this.map, layerIdx)) {
                    for (let pos in this.map[layerIdx]) {
                        let curInfo: IMapItem = this.map[layerIdx][pos];
                        orderList.push(curInfo.shape);
                    }
                }
            }
            orderList.sort(() => {
                return Math.random() - 0.5;
            }); //随机打乱顺序
            for (let layerIdx in this.map) {
                if (Object.prototype.hasOwnProperty.call(this.map, layerIdx)) {
                    for (let pos in this.map[layerIdx]) {
                        if (Object.prototype.hasOwnProperty.call(this.map[layerIdx], pos)) {
                            let curInfo: IMapItem = this.map[layerIdx][pos];
                            let position = curInfo.item.position.clone();
                            let layerIdx1 = curInfo.layerIdx;
                            let pos1 = curInfo.pos;
                            let shape = orderList.pop();
                            this.map[layerIdx][pos].shape = shape;
                            Tween.stopAllByTarget(curInfo.item);
                            tween(curInfo.item)
                                .to(0.5, {
                                    position: v3(0, 0, 0),
                                })
                                .call(() => {
                                    this.setItem(curInfo.item, shape, layerIdx1, pos1);
                                })
                                .delay(0.2)
                                .to(0.5, {
                                    position: position,
                                })
                                .call(() => {
                                    if (orderList.length == 0) {
                                        this.isRefreshAni = false;
                                    }
                                })
                                .start();
                        }
                    }
                }
            }
        });
        this.playBtn.on(Button.EventType.CLICK, () => {
            this.level = 1;
            this.startGame()
        })
    }
    startGame() {
        this.layerYang.removeAllChildren()
        this.layerDeal.removeAllChildren()
        this.map = {};
        this.mapMaxIndex = 0;
        this.initLevel();
        this.initDeal();
        // 游戏开始阶段隐藏游戏结束的精灵
        this.isGameOver = false
        this.layerGameOver.active = false
        // this.mask.active = false
        this.playBtn.active = false
    }
    initDeal() {
        let w = 72;
        this.dealList = [];
        this.dealList.push({
            //中间的算出来
            x: 0,
            y: 0,
            item: null,
            isMove: false,
        });
        for (let i = 1; i < Math.floor(this.dealMaxNum / 2) + 1; i++) {
            this.dealList.push({
                x: i * w,
                y: 0,
                item: null,
                isMove: false,
            });
            this.dealList.push({
                x: -i * w,
                y: 0,
                item: null,
                isMove: false,
            });
        }
        this.dealList.sort((a, b) => {
            return a.x - b.x;
        });
    }
    initLevel() {
        let levelInfo = TABLE[`level${this.level}`];
        let tempList = []; //临时放入
        let orderList = [];
        let maxNum = 0; // 一个多少个item
        let w = 72;
        let h = 102;
        let x = -w * 2.5;
        let y = -h * 2.5;
        for (let i = 0; i < 9; i++) tempList.push(i);
        for (let layerIdx in levelInfo.map) {
            if (Object.prototype.hasOwnProperty.call(levelInfo.map, layerIdx)) {
                for (let pos of levelInfo.map[layerIdx]) {
                    maxNum++;
                }
            }
        }
        while (maxNum > 0) {
            if (tempList.length == 0) {
                for (let i = 0; i < 9; i++) tempList.push(i);
            }
            let key = tempList.pop();
            orderList = orderList.concat([key, key, key]);
            maxNum -= 3;
        }
        orderList.sort(() => {
            return Math.random() - 0.5;
        }); //随机打乱顺序
        for (let layerIdx in levelInfo.map) {
            if (Object.prototype.hasOwnProperty.call(levelInfo.map, layerIdx)) {
                this.map[layerIdx] = {};
                for (let pos of levelInfo.map[layerIdx]) {
                    let col = pos % 100; //
                    let row = (pos - col) / 100;
                    this.mapMaxIndex += 1;
                    let newYangItem: Node = instantiate(this.yangItem);
                    newYangItem.active = true;
                    this.layerYang.addChild(newYangItem);
                    newYangItem.setPosition(v3(x + (w / 2) * col, y + (h / 2) * row + parseInt(layerIdx) * 10));
                    let shape = orderList.pop();
                    this.setItem(newYangItem, shape, parseInt(layerIdx), pos);
                    let curInfo: IMapItem = (this.map[layerIdx][pos] = {
                        layerIdx: parseInt(layerIdx),
                        pos: pos,
                        item: newYangItem,
                        lockNum: 0,
                        lockList: [],
                        shape: shape,
                    });
                    if (parseInt(layerIdx) == 0) {
                        //如果第一排 就不隐藏
                        continue;
                    }
                    for (let upPos in this.map) {
                        if (Object.prototype.hasOwnProperty.call(this.map, upPos)) {
                            for (let upPosK in this.map[upPos]) {
                                if (Object.prototype.hasOwnProperty.call(this.map[upPos], upPosK)) {
                                    let info: IMapItem = this.map[upPos][upPosK];
                                    if ([101, 100, 99, 1].indexOf(Math.abs(parseInt(upPosK) - parseInt(pos))) == -1) {
                                        continue;
                                    }
                                    curInfo.lockList.push({ upPos, upPosK });
                                    info.lockNum++;
                                    info.item.getChildByName("sprite").getComponent(Sprite).color = new math.Color(100, 100, 100);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    setItem(item: Node, shape: number | string, layerIdx: number, pos: number | string) {
        let levelInfo = TABLE[`level${this.level}`];
        item.getChildByName("Label").getComponent(Label).string = shape.toString();
        item.on(Node.EventType.TOUCH_END, () => {
            if (this.isGameOver) return;
            this.onClickDeal(layerIdx, pos);
        });
    }
    onClickDeal(layerIdx: number, pos: number | string) {
        if (this.isEliminateAni) return;
        let itemInfo: IMapItem = this.map[layerIdx][pos];
        if (!itemInfo || itemInfo.lockNum) {
            return;
        }
        if (!this.doDeal(itemInfo)) {
            // console.log("满了");
            return this.gameOver()
        }
        itemInfo.lockList.forEach((element) => {
            let upPos = element.upPos;
            let upPosK = element.upPosK;
            this.map[upPos][upPosK].lockNum--;
            if (this.map[upPos][upPosK].lockNum == 0) {
                this.map[upPos][upPosK].item.getChildByName("sprite").getComponent(Sprite).color = new math.Color(255, 255, 255);
            }
        });
        delete this.map[layerIdx][pos];
    }
    doDeal(itemInfo: IMapItem) {
        this.isEliminateAni = true;
        let index = -1;
        for (let i = 0; i < this.dealList.length; i++) {
            const element = this.dealList[i];
            if (element.item && element.shape == itemInfo.shape) {
                index = i;
            }
        }
        let dealItem: IDealItem = null;
        if (index !== -1) {
            for (let y = this.dealList.length - 1; y > index; y--) {
                const element = this.dealList[y];
                if (element.item && element.isMove == false && this.dealList[y + 1]) {
                    element.item.position = v3(this.dealList[y + 1].x, this.dealList[y + 1].y);
                    this.dealList[y + 1].item = element.item;
                    this.dealList[y + 1].shape = element.shape;
                    this.dealList[y + 1].isMove = true;
                    this.dealList[y].item = null;
                    this.dealList[y].shape = null;
                    this.dealList[y].isMove = false;
                }
            }
            dealItem = this.dealList[index + 1];
        } else {
            for (let info of this.dealList) {
                if (info.item == null) {
                    dealItem = info;
                    break;
                }
            }
        }
        if (dealItem) {
            Tween.stopAllByTarget(itemInfo.item);
            let worldPos = v3(0, 0, 0);
            let nodePos = v3(0, 0, 0);
            itemInfo.item.getWorldPosition(worldPos);
            this.layerDeal.getComponent(UITransform).convertToNodeSpaceAR(worldPos, nodePos);
            itemInfo.item.parent = this.layerDeal;
            itemInfo.item.position = nodePos;
            dealItem.item = itemInfo.item;
            dealItem.shape = itemInfo.shape;
            tween(itemInfo.item)
                .to(0.3, {
                    position: v3(dealItem.x, dealItem.y, 0),
                })
                .call(async () => {
                    await this.checkSame(itemInfo.shape);
                    this.isEliminateAni = false;
                    if (this.mapMaxIndex == 0) {
                        return this.doOver(true);
                    }
                    if (this.dealList[this.dealList.length - 1].item) {
                        return this.doOver(false);
                    }
                })
                .start();
            return true;
        }
        this.isEliminateAni = false;
        return false;
    }
    doOver(win = false) {
        if (win) {
            this.level += 1;
            this.startGame();
            return console.log("赢了");
        } else {
            return this.gameOver()
        }
    }
    checkSame(shape: number) {
        return new Promise((resolve, rejects) => {
            let temp = [];
            for (let info of this.dealList) {
                if (info.item && info.shape == shape) {
                    temp.push(info);
                }
                info.isMove = false;
            }
            if (temp.length == 3) {
                for (let info of temp) {
                    let item: Node = info.item;
                    Tween.stopAllByTarget(item);
                    tween(item)
                        .to(0.1, {
                            scale: v3(0, 0, 0),
                        })
                        .call(() => {
                            item.destroy();
                            temp.pop();
                            this.mapMaxIndex -= 1;
                            if (temp.length == 0) {
                                this.doSortDealList();
                                resolve(true);
                            }
                        })
                        .start();
                    info.item = null;
                }
            } else {
                resolve(false);
            }
        });
    }
    doSortDealList() {
        for (let i = 0; i < this.dealList.length; i++) {
            if (this.dealList[i].item) {
                continue;
            }
            for (let j = i + 1; j < this.dealList.length; j++) {
                if (this.dealList[j].item) {
                    this.dealList[i].item = this.dealList[j].item;
                    this.dealList[j].item = null;
                    this.dealList[i].shape = this.dealList[j].shape;
                    Tween.stopAllByTarget(this.dealList[i].item);
                    tween(this.dealList[i].item)
                        .to(0.1, {
                            position: v3(this.dealList[i].x, this.dealList[i].y, 0),
                        })
                        .start();
                    break;
                }
            }
        }
    }
    gameOver() {
        // 游戏结束时，显示gameover
        this.isGameOver = true
        this.layerGameOver.active = true
        this.playBtn.active = true
        // this.mask.active = true
    }
}
