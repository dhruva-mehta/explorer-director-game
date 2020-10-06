import React from 'react';
import Graph from 'react-graph-vis';
import { Button, Alert, Select, InputNumber } from "antd";
import logo from './logo.svg';
import './App.css';
import "antd/dist/antd.css";
import { v4 as uuidv4 } from 'uuid';

const _ = require('lodash')
const { Option } = Select

const baseGraph = {
  nodes: [
    { id: 1, group: 'unvisited'},
    { id: 2, group: 'unvisited'},
    { id: 3, group: 'unvisited'},
    { id: 4, group: 'unvisited'},
    { id: 5, group: 'unvisited'}
  ],
  edges: [
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
    { from: 4, to: 5 },
    { from: 5, to: 1 },
  ]
}

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state =  {
      graph: baseGraph,
      options: {
        configure: {
          enabled: false,
          filter: 'nodes,edges',
        },
        groups: {
          unvisited: {color: {background: 'white'}},
          visited: {color: {background: 'red'}},
          current: {color: {background: 'blue'}}
        },
        layout: {
          improvedLayout: true,
          hierarchical: false
        },
        edges: {
          arrows: {
            to: {
              enabled: false
            }
          },
          color: "#000000",
          hoverWidth: 10,
          selectionWidth: 3,
        },
        interaction: {
          selectable: true
        },
        nodes: {
          borderWidth: 2,
          borderWidthSelected: 3,
          chosen: false,
          color: {
            border: "#000000",
            background: "#ffffff",
          }
        },
        physics: {
          enabled: false
        },
        height: "640px"
      },
      events: {
        selectNode: (event) => {
          let node = event.nodes[0]
          let nodesObj = this.network.body.nodes
          let newGraph = _.cloneDeep(this.state.graph)
          newGraph.nodes = _.map(newGraph.nodes, (node) => {
            node.x = nodesObj[node.id].x
            node.y = nodesObj[node.id].y
            return node
          })
          if (this.state.setStart) {
            this.setState({setStart: false})
            this.setState({gameStart: true})
          }
          newGraph.nodes[node-1].group = 'current'
          let pastCurrent = _.findIndex(this.state.graph.nodes, function(node) {
            return node.group === 'current'
          })
          if (pastCurrent >= 0) {
            newGraph.nodes[pastCurrent].group = "visited"
          }
          if (this.state.graphSettings.user === 'explorer') {
            this.setState(prevState => ({
              graph: newGraph,
              current: node,
              options: {
                ...prevState.options,
                interaction: {
                  ...prevState.options.interaction,
                  selectable: false
                }
              },
            }))
          } else if (this.state.graphSettings.user === 'director') {
            console.log(node)
            console.log(this.state.distList)
            this.setState(prevState => ({
              graph: newGraph,
              current: node,
              options: {
                ...prevState.options,
                interaction: {
                  ...prevState.options.interaction,
                  selectable: true
                },
              }
            }))
          }
        },
      },
      setStart: true,
      gameStart: false,
      graphSettings: {
        type: 'cycle',
        length: 5,
        user: 'explorer',
      },

      userInput: null,
      adjList: {
        1: [2,5],
        2: [1,3],
        3: [2,4],
        4: [3,5],
        5: [1,4],
      },
      current: null,
      distList: {},
      illegalMove: false,
    };
  }

  setNetworkInstance = nw => {
    this.network = nw;
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.graphSettings !== prevState.graphSettings) {
      let newAdjList = {}
      _.forEach(this.state.graph.edges, (edge) => {
        if (newAdjList[edge.from]) {
          newAdjList[edge.from].push(edge.to)
        } else {
          newAdjList[edge.from] = [edge.to]
        }
        if (newAdjList[edge.to]) {
          newAdjList[edge.to].push(edge.from)
        } else {
          newAdjList[edge.to] = [edge.from]
        }
      })
      this.setState({adjList: newAdjList})
    }
    if (this.state.current !== prevState.current) {
      const visited = []
      const visitList = []
      const distDict = {}
      visitList.push({nodeId: this.state.current, dist: 1})
      visited.push(this.state.current)
      while (visitList.length > 0) {
        const node = visitList.shift()
        _.forEach(this.state.adjList[node.nodeId], (neighbor) => {
          if (!_.includes(visited, neighbor)) {
            visited.push(neighbor)
            if (distDict[node.dist]) {
              distDict[node.dist].push(neighbor)
            } else {
              distDict[node.dist] = [neighbor]
            }
            visitList.push({nodeId: neighbor, dist: node.dist + 1})
          }
        })
      }
      this.setState({distList: distDict})
    }
  }

  graphReset = () => {
    this.network.unselectAll()
    this.setState(() => {
      let newGraph = _.cloneDeep(this.state.graph)
      _.forEach(newGraph.nodes, (node) => {
        node.group = "unvisited"
      })
      return {graph: newGraph}
    })
  }

  handleNewGame = () => {
    this.graphReset()
    this.setState(prevState => ({
      setStart: true,
      gameStart: false,
      current: null,
      distList: {},
      options: {
        ...prevState.options,
        interaction: {
          ...prevState.options.interaction,
          selectable: true
        }
      }
    }))
  }

  handleTypeChange = (value) => {
    this.setState({graphSettings: {...this.state.graphSettings, type: value}})
    this.createGraph(value, this.state.graphSettings.length)
  }

  handleLengthChange = (value) => {
    this.setState({graphSettings: {...this.state.graphSettings, length: value}})
    this.createGraph(this.state.graphSettings.type, value)
  }

  handleUserChange = (value) => {
    this.setState({graphSettings: {...this.state.graphSettings, user: value}})
  }

  handleExplorerInput = (value) => {
    this.setState({userInput: value})
  }

  handleExplorerSubmit = () => {
    let compMove = null
    if (this.state.userInput > 0 && this.state.userInput < this.state.graphSettings.length) {
      const possibleMoves = this.state.distList[this.state.userInput]
      const bestMove = _.find(possibleMoves, (nodeId) => {
        const move = _.find(this.state.graph.nodes, (node) => {
          return node.id === nodeId
        })
        if (move.group === 'visited') {
          return move
        }
      })
      if (bestMove) {
        compMove = bestMove
      } else {
        compMove = possibleMoves[0]
      }
    }
    let newGraph = _.cloneDeep(this.state.graph)
    newGraph.nodes[compMove-1].group = 'current'
    let pastCurrent = _.findIndex(this.state.graph.nodes, function(node) {
      return node.group === 'current'
    })
    if (pastCurrent >= 0) {
      newGraph.nodes[pastCurrent].group = "visited"
    }
    this.setState({graph: newGraph, current: compMove})
  }

  createGraph = (type, length) => {
    let nodes = []
    let edges = []
    switch(type) {
      case 'cycle':
        for (var i = 1; i <= length; i++) {
          nodes.push({ id: i, group: 'unvisited'})
          if (i === length) {
            edges.push({ from: i, to: 1 })
          } else {
            edges.push({ from: i, to: i+1 })
          }
        }
        break;
      case 'line':
        for (let i = 1; i <= length; i++) {
          nodes.push({ id: i, group: 'unvisited'})
          if (i < length) {
            edges.push({ from: i, to: i+1 })
          }
        }
        break;
    }
    let newGraph = {
      nodes: nodes,
      edges: edges
    }
    this.setState({graph: newGraph})
  }

  render() {
    return (
      <div>
        {this.state.setStart &&
        <Alert
          message="Please select the Node where you would like to start"
          type="info"
        ></Alert>}
        {this.state.illegalMove &&
        <Alert
          message="This was not an available move. Please try again"
          type="info"
        ></Alert>}
        <Graph
          key={uuidv4()}
          graph={this.state.graph}
          options={this.state.options}
          events={this.state.events}
          getNetwork={this.setNetworkInstance}
        />
        <div style={{width:'100%'}}>
          <Button type="primary" onClick={this.handleNewGame}> New Game </Button>
          <div>
          <Select defaultValue="explorer" style={{width:120}} onChange={this.handleUserChange}>
            <Option value="explorer">Explorer</Option>
            <Option value="director">Director</Option>
          </Select>
          <Select defaultValue="cycle" style={{width:120}} onChange={this.handleTypeChange}>
            <Option value="cycle">Cycle</Option>
            <Option value="line">Line</Option>
          </Select>
          Graph Length
          <InputNumber min={1} max={10} defaultValue={5} onChange={this.handleLengthChange} />
          </div>
        </div>
        <div>
          {this.state.graphSettings.user === 'explorer' && this.state.gameStart &&
          <div>
            Please input a distance between 1 and {_.keys(this.state.distList).length}
            <InputNumber min={1} max={this.state.graphSettings.length} onChange={this.handleExplorerInput}/>
            <Button type='primary' onClick={this.handleExplorerSubmit}>
              Submit Distance
            </Button>
          </div>}
          {this.state.graphSettings.user === 'director' && this.state.gameStart &&
          <div>
            Please move the explorer {this.state.explorerMove} nodes away
          </div>}
        </div>
      </div>
    )
  }
}

export default App;
